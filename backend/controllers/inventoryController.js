const XLSX = require("xlsx");
const inventoryModel = require("../models/inventoryModel");

const REQUIRED_COLUMNS = {
  stockNumber: "Stock Number",
  batchNumber: "Batch Number",
  expectedQuantity: "Closing Quantity",
};

const normalizeString = (value) => String(value ?? "").trim();

const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

  return rows
    .map((row) => {
      const stockNumber = normalizeString(row[REQUIRED_COLUMNS.stockNumber]);
      const batchNumber = normalizeString(row[REQUIRED_COLUMNS.batchNumber]);
      const expectedQuantity = Number(row[REQUIRED_COLUMNS.expectedQuantity] ?? 0);

      if (!stockNumber || !batchNumber || Number.isNaN(expectedQuantity)) {
        return null;
      }

      return {
        stockNumber,
        batchNumber,
        expectedQuantity,
      };
    })
    .filter(Boolean);
};

const uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    const items = parseExcelBuffer(req.file.buffer);

    if (!items.length) {
      return res.status(400).json({ message: "No valid rows found in Excel file" });
    }

    await inventoryModel.upsertInventoryItems(items);
    const inventory = await inventoryModel.getAllInventory();

    res.status(201).json({
      message: "Excel data uploaded successfully",
      count: items.length,
      inventory,
    });
  } catch (error) {
    next(error);
  }
};

const scanInventoryItem = async (req, res, next) => {
  try {
    const batchNumber = normalizeString(req.body.batchNumber);
    const stockNumber = normalizeString(req.body.stockNumber);

    if (!batchNumber) {
      return res.status(400).json({ message: "Batch Number is required" });
    }

    if (!stockNumber) {
      return res.status(400).json({ message: "Stock Number is required" });
    }

    const batchExists = await inventoryModel.batchExists(batchNumber);

    if (!batchExists) {
      return res.status(404).json({ message: "Batch Number not found in Excel data" });
    }

    const inventoryItem = await inventoryModel.findInventoryItem(batchNumber, stockNumber);

    if (!inventoryItem) {
      return res.status(404).json({
        message: "Stock Number does not belong to the selected Batch Number",
      });
    }

    const updatedItem = await inventoryModel.incrementScannedQuantity(batchNumber, stockNumber);

    res.json({
      message: "Scan recorded successfully",
      item: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

const adjustScannedQuantity = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const delta = Number(req.body.delta);

    if (!Number.isInteger(id) || !Number.isInteger(delta) || delta === 0) {
      return res.status(400).json({ message: "Valid item id and delta are required" });
    }

    const updatedItem = await inventoryModel.adjustScannedQuantityById(id, delta);

    if (!updatedItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    res.json({
      message:
        delta > 0
          ? "Scanned quantity increased successfully"
          : "Scanned quantity decreased successfully",
      item: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

const getInventory = async (_req, res, next) => {
  try {
    const inventory = await inventoryModel.getAllInventory();
    res.json(inventory);
  } catch (error) {
    next(error);
  }
};

const resetInventory = async (_req, res, next) => {
  try {
    await inventoryModel.resetScannedQuantities();
    const inventory = await inventoryModel.getAllInventory();

    res.json({
      message: "Scanned quantities reset successfully",
      inventory,
    });
  } catch (error) {
    next(error);
  }
};

const exportInventory = async (_req, res, next) => {
  try {
    const inventory = await inventoryModel.getAllInventory();

    const rows = inventory.map((item) => ({
      "Stock Number": item.stockNumber,
      "Batch Number": item.batchNumber,
      "Closing Quantity": item.expectedQuantity,
      "Scanned Quantity": item.scannedQuantity,
      Variance: item.variance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="cycle-count-inventory.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adjustScannedQuantity,
  exportInventory,
  getInventory,
  resetInventory,
  scanInventoryItem,
  uploadExcel,
};
