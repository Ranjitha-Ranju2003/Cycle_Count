# How This Project Works

This document explains the project in simple steps so it is easy to understand what happens when the user clicks each button and performs each action.

## 1. What this application does

This is a warehouse cycle count application.

Its job is to:

- upload inventory data from an Excel file
- save that data into PostgreSQL
- scan barcodes one by one
- increase the scanned quantity for matching items
- show the difference between expected stock and scanned stock
- export the updated result back to Excel

## 2. Main parts of the project

The project has 3 main parts:

### Frontend

The frontend is the screen the user sees in the browser.

It is built with React.

Important frontend files:

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/FileUpload.jsx`
- `frontend/src/components/BarcodeInput.jsx`
- `frontend/src/components/CameraScanner.jsx`
- `frontend/src/components/DashboardTable.jsx`
- `frontend/src/components/LastScannedCard.jsx`
- `frontend/src/services/api.js`

### Backend

The backend receives requests from the frontend and talks to the database.

It is built with Node.js and Express.

Important backend files:

- `backend/server.js`
- `backend/routes/inventoryRoutes.js`
- `backend/controllers/inventoryController.js`
- `backend/models/inventoryModel.js`
- `backend/db/index.js`

### Database

PostgreSQL stores all inventory records in the `inventory` table.

Important database file:

- `backend/db/schema.sql`

## 3. What data is stored

Each inventory row contains:

- `barcode`
- `stock_number`
- `batch_number`
- `expected_quantity`
- `scanned_quantity`

`expected_quantity` comes from the Excel file.

`scanned_quantity` starts at `0` and increases every time the barcode is scanned.

## 4. Simple project flow

The app works in this order:

1. User opens the React app in the browser.
2. React loads the dashboard.
3. React asks the backend for all current inventory data.
4. Backend reads inventory data from PostgreSQL.
5. Backend sends that data back to React.
6. The dashboard table shows all items.
7. User uploads an Excel file.
8. Backend reads the Excel rows and stores them in PostgreSQL.
9. User scans a barcode using scanner input or camera.
10. Backend finds that barcode in the database.
11. If found, `scanned_quantity` increases by 1.
12. The updated item is sent back to the frontend.
13. The dashboard updates the row and shows the latest item details.
14. User can reset counts or export the updated result to Excel.

## 5. What happens when the page opens

When the page opens:

1. `DashboardPage.jsx` runs.
2. It calls `fetchInventory()` from `frontend/src/services/api.js`.
3. That sends a `GET /inventory` request to the backend.
4. The backend route sends the request to the controller.
5. The controller asks the model to get all inventory rows.
6. The model runs SQL on PostgreSQL.
7. Data comes back to the frontend.
8. The table and summary cards show the current database state.

## 6. How the Upload Excel button works

### Button

`Upload Excel`

### Frontend flow

1. The user chooses an `.xlsx` file.
2. The user clicks `Upload Excel`.
3. `FileUpload.jsx` sends the file to the backend.
4. The request goes to `POST /upload-excel`.

### Backend flow

1. Express receives the file using `multer`.
2. `inventoryController.uploadExcel` reads the Excel file using `xlsx`.
3. It reads the first sheet.
4. It looks for these columns:
   - `Barcode`
   - `Stock Number`
   - `Batch Number`
   - `Closing Quantity`
5. Valid rows are converted into JavaScript objects.
6. The backend saves them into PostgreSQL.
7. If a barcode already exists, that row is updated.
8. The backend returns the refreshed inventory list.

### What the user sees

- success message after upload
- table filled with uploaded rows
- summary cards updated

## 7. How the Scanner Input works

### Button / action

`Scan`

or press `Enter` after the barcode is entered by scanner input.

### Frontend flow

1. The scanner behaves like a keyboard.
2. It types the barcode into the input box.
3. It usually sends `Enter` at the end.
4. `BarcodeInput.jsx` catches the Enter key.
5. It calls the scan API with the barcode.

### Backend flow

1. The frontend sends `POST /scan`.
2. The body contains the scanned barcode.
3. The backend checks whether the barcode exists in the `inventory` table.
4. If found, `scanned_quantity = scanned_quantity + 1`.
5. The updated row is returned.
6. If not found, the backend sends the error:
   `Item not in Excel data`

### What the user sees

- success message if barcode exists
- error message if barcode does not exist
- beep sound on success
- last scanned item card updates
- table row updates
- variance changes automatically

## 8. How the Camera Scan button works

### Button

`Start Camera`

### Frontend flow

1. User clicks `Start Camera`.
2. `CameraScanner.jsx` opens the device camera using `html5-qrcode`.
3. The camera starts reading barcodes.
4. When a barcode is detected, it calls the same scan API used by scanner input.
5. Duplicate quick reads are limited to avoid accidental multiple scans.

### What the user sees

- camera preview appears
- barcode scan updates the same table and last scanned card
- user can click `Stop Camera` to stop scanning

## 9. How the dashboard table works

The dashboard table shows all records from the database.

Columns:

- Barcode
- Stock Number
- Batch Number
- Expected Qty
- Scanned Qty
- Variance

### Color logic

- green row means `variance = 0`
- red row means `variance` is not `0`

### Variance formula

`variance = expected_quantity - scanned_quantity`

## 10. How the Last Scanned Item card works

This card shows the latest successful scanned item.

It displays:

- Stock Number
- Batch Number
- Expected Quantity
- Scanned Quantity
- Variance

If nothing has been scanned yet, it shows a simple message.

## 11. How the Reset Counts button works

### Button

`Reset Counts`

### Flow

1. User clicks `Reset Counts`.
2. Frontend sends `POST /reset`.
3. Backend updates all rows in PostgreSQL.
4. `scanned_quantity` becomes `0` for every item.
5. Backend sends back the updated inventory list.
6. Frontend refreshes the dashboard and clears the last scanned item card.

### What the user sees

- success message
- all scanned quantities become `0`
- variances return to original expected values

## 12. How the Export Excel button works

### Button

`Export Excel`

### Flow

1. User clicks `Export Excel`.
2. Frontend sends `GET /export-excel`.
3. Backend reads all inventory rows from PostgreSQL.
4. Backend creates a new Excel file using `xlsx`.
5. The file includes:
   - Barcode
   - Stock Number
   - Batch Number
   - Closing Quantity
   - Scanned Quantity
   - Variance
6. The browser downloads the Excel file.

### What the user sees

- an Excel file is downloaded
- it contains the updated count status

## 13. API summary

These are the main backend APIs:

### `POST /upload-excel`

Used to upload the Excel file.

### `POST /scan`

Used when a barcode is scanned.

### `GET /inventory`

Used to load all inventory rows.

### `POST /reset`

Used to reset all scanned quantities to zero.

### `GET /export-excel`

Used to download the updated inventory as Excel.

## 14. How files connect to each other

Here is the simple connection flow:

1. React component triggers an action.
2. `frontend/src/services/api.js` sends HTTP request.
3. Express route receives the request.
4. Controller handles request logic.
5. Model runs database query.
6. PostgreSQL stores or returns data.
7. Controller sends response back.
8. React updates the UI.

## 15. One example from start to finish

Example:

1. User uploads Excel with barcode `12345`.
2. Database stores that row with `expected_quantity = 10` and `scanned_quantity = 0`.
3. User scans barcode `12345`.
4. Backend finds the row.
5. Backend updates `scanned_quantity` from `0` to `1`.
6. Frontend receives the updated row.
7. Last scanned item card shows the item.
8. Table shows:
   - Expected Qty = 10
   - Scanned Qty = 1
   - Variance = 9
9. After 10 successful scans, variance becomes `0`.
10. The row turns green.

## 16. Short summary

This project works like this:

- upload inventory from Excel
- save it into PostgreSQL
- scan barcodes
- update scanned counts
- show live variance
- reset if needed
- export final result to Excel

It is a simple React -> Express -> PostgreSQL workflow.
