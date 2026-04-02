CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  stock_number TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  expected_quantity INTEGER NOT NULL,
  scanned_quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE (stock_number, batch_number)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
