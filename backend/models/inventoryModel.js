const db = require("../db");

const mapInventoryRow = (row) => ({
  id: row.id,
  stockNumber: row.stock_number,
  batchNumber: row.batch_number,
  expectedQuantity: Number(row.expected_quantity),
  scannedQuantity: Number(row.scanned_quantity),
  variance: Number(row.expected_quantity) - Number(row.scanned_quantity),
});

const ensureInventoryTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      stock_number TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      expected_quantity INTEGER NOT NULL,
      scanned_quantity INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Migrate older barcode-based installs to the new stock+batch identity.
  await db.query(`
    ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS stock_number TEXT,
    ADD COLUMN IF NOT EXISTS batch_number TEXT,
    ADD COLUMN IF NOT EXISTS expected_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS scanned_quantity INTEGER NOT NULL DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE inventory
    ALTER COLUMN stock_number SET NOT NULL,
    ALTER COLUMN batch_number SET NOT NULL,
    ALTER COLUMN expected_quantity SET NOT NULL
  `);

  await db.query(`
    DROP INDEX IF EXISTS inventory_stock_batch_unique_idx;
    CREATE UNIQUE INDEX inventory_stock_batch_unique_idx
    ON inventory (stock_number, batch_number)
  `);

  await db.query(`
    ALTER TABLE inventory
    DROP COLUMN IF EXISTS barcode
  `);
};

const getAllInventory = async () => {
  const result = await db.query(
    `
      SELECT id, stock_number, batch_number, expected_quantity, scanned_quantity
      FROM inventory
      ORDER BY batch_number ASC, stock_number ASC
    `
  );

  return result.rows.map(mapInventoryRow);
};

const upsertInventoryItems = async (items) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    for (const item of items) {
      await client.query(
        `
          INSERT INTO inventory (stock_number, batch_number, expected_quantity, scanned_quantity)
          VALUES ($1, $2, $3, COALESCE($4, 0))
          ON CONFLICT (stock_number, batch_number)
          DO UPDATE SET
            expected_quantity = EXCLUDED.expected_quantity
        `,
        [
          item.stockNumber,
          item.batchNumber,
          item.expectedQuantity,
          item.scannedQuantity ?? 0,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to upsert inventory items:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

const incrementScannedQuantity = async (batchNumber, stockNumber) => {
  const result = await db.query(
    `
      UPDATE inventory
      SET scanned_quantity = scanned_quantity + 1
      WHERE LOWER(batch_number) = LOWER($1)
        AND LOWER(stock_number) = LOWER($2)
      RETURNING id, stock_number, batch_number, expected_quantity, scanned_quantity
    `,
    [batchNumber, stockNumber]
  );

  return result.rows[0] ? mapInventoryRow(result.rows[0]) : null;
};

const findInventoryItem = async (batchNumber, stockNumber) => {
  const result = await db.query(
    `
      SELECT id, stock_number, batch_number, expected_quantity, scanned_quantity
      FROM inventory
      WHERE LOWER(batch_number) = LOWER($1)
        AND LOWER(stock_number) = LOWER($2)
    `,
    [batchNumber, stockNumber]
  );

  return result.rows[0] ? mapInventoryRow(result.rows[0]) : null;
};

const batchExists = async (batchNumber) => {
  const result = await db.query(
    `
      SELECT 1
      FROM inventory
      WHERE LOWER(batch_number) = LOWER($1)
      LIMIT 1
    `,
    [batchNumber]
  );

  return Boolean(result.rows[0]);
};

const adjustScannedQuantityById = async (id, delta) => {
  const result = await db.query(
    `
      UPDATE inventory
      SET scanned_quantity = GREATEST(scanned_quantity + $2, 0)
      WHERE id = $1
      RETURNING id, stock_number, batch_number, expected_quantity, scanned_quantity
    `,
    [id, delta]
  );

  return result.rows[0] ? mapInventoryRow(result.rows[0]) : null;
};

const resetScannedQuantities = async () => {
  await db.query("UPDATE inventory SET scanned_quantity = 0");
};

module.exports = {
  adjustScannedQuantityById,
  batchExists,
  ensureInventoryTable,
  findInventoryItem,
  getAllInventory,
  incrementScannedQuantity,
  resetScannedQuantities,
  upsertInventoryItems,
};
