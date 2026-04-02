const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to your local .env file or Render environment variables.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost")
    ? false
    : {
        rejectUnauthorized: false,
      },
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

const testConnection = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
  }
};

void testConnection();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
