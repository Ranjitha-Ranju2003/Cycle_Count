const db = require("../db");

const mapUserRow = (row) => ({
  id: row.id,
  fullName: row.full_name,
  company: row.company,
  email: row.email,
});

const ensureUsersTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      payload JSONB,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
};

const createUser = async ({ fullName, company, email, password }) => {
  const result = await db.query(
    `
      INSERT INTO users (full_name, company, email, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, company, email
    `,
    [fullName, company, email, password]
  );

  return mapUserRow(result.rows[0]);
};

const findUserByEmail = async (email) => {
  const result = await db.query(
    `
      SELECT id, full_name, company, email, password
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `,
    [email]
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];

  return {
    ...mapUserRow(row),
    password: row.password,
  };
};

const updateUserById = async (id, { fullName, company, email }) => {
  const result = await db.query(
    `
      UPDATE users
      SET full_name = $2,
          company = $3,
          email = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, company, email
    `,
    [id, fullName, company, email]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

const updatePasswordByEmail = async (email, password) => {
  const result = await db.query(
    `
      UPDATE users
      SET password = $2,
          updated_at = NOW()
      WHERE LOWER(email) = LOWER($1)
      RETURNING id, full_name, company, email
    `,
    [email, password]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

const deleteUserById = async (id) => {
  const result = await db.query(
    `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, full_name, company, email
    `,
    [id]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

const storeEmailOtp = async ({ email, purpose, otpCode, payload, expiresAt }) => {
  await db.query(
    `
      DELETE FROM email_otps
      WHERE LOWER(email) = LOWER($1)
        AND purpose = $2
    `,
    [email, purpose]
  );

  await db.query(
    `
      INSERT INTO email_otps (email, purpose, otp_code, payload, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [email, purpose, otpCode, payload || null, expiresAt]
  );
};

const findValidEmailOtp = async ({ email, purpose, otpCode }) => {
  const result = await db.query(
    `
      SELECT id, email, purpose, otp_code, payload, expires_at
      FROM email_otps
      WHERE LOWER(email) = LOWER($1)
        AND purpose = $2
        AND otp_code = $3
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [email, purpose, otpCode]
  );

  return result.rows[0] || null;
};

const deleteEmailOtps = async (email, purpose) => {
  await db.query(
    `
      DELETE FROM email_otps
      WHERE LOWER(email) = LOWER($1)
        AND purpose = $2
    `,
    [email, purpose]
  );
};

module.exports = {
  createUser,
  deleteUserById,
  deleteEmailOtps,
  ensureUsersTable,
  findValidEmailOtp,
  findUserByEmail,
  storeEmailOtp,
  updatePasswordByEmail,
  updateUserById,
};
