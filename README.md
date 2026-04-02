# Cycle Count Scanner Web Application

Full-stack warehouse cycle count app with React, Express, and PostgreSQL.

## Features

- Upload inventory from Excel (`.xlsx`)
- Scan using a barcode scanner that behaves like keyboard input
- Scan using device camera with `html5-qrcode`
- Increment `scanned_quantity` on each valid scan
- Show last scanned item and live variance
- Display full inventory dashboard with matched and unmatched highlights
- Reset all scanned quantities
- Export updated inventory back to Excel

## Project Structure

```text
DataForCycleCount/
  backend/
    controllers/
    db/
    models/
    routes/
    server.js
  frontend/
    src/
      components/
      pages/
      services/
```

## PostgreSQL Schema

Run the schema in `backend/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  stock_number TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  expected_quantity INTEGER NOT NULL,
  scanned_quantity INTEGER NOT NULL DEFAULT 0
);
```

## Backend Setup

1. Create a PostgreSQL database, for example `cycle_count_db`.
2. Run the schema file.
3. Copy `backend/.env.example` to `backend/.env`.
4. Update `DATABASE_URL` if needed.
5. Install dependencies:

```bash
cd backend
npm install
```

6. Start the backend:

```bash
npm run dev
```

Backend runs at `http://localhost:5000`.

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Optional: create `frontend/.env` and set:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

3. Start the frontend:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

## API Endpoints

- `POST /upload-excel`
  Upload field name: `file`
- `POST /scan`
  Body: `{ "barcode": "1234567890" }`
- `GET /inventory`
- `POST /reset`
- `GET /export-excel`

## Expected Excel Columns

The uploaded `.xlsx` file should contain these columns in the first sheet:

- `Barcode`
- `Stock Number`
- `Batch Number`
- `Closing Quantity`

## Notes

- Upload uses upsert by `barcode`, so re-uploading updates stock details and expected quantity.
- Barcode scanners typically send the barcode quickly and finish with Enter, which the UI handles.
- Camera scanning requires browser camera permission.
# Cycle_Count
