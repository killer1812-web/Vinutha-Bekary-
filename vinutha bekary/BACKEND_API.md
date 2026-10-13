# Vinutha Bakery – Backend Architecture & API Specification

The Vinutha Bakery digital platform includes a full-stack, connected Node.js + Express backend server with atomic relational persistence in `server/data/bakery_database.json`, file upload storage in `server/uploads/`, and Vite reverse proxy routing.

---

## 1. Running the Full Stack (Frontend + Backend)

### Start Backend API Server (Port 5000):
```bash
npm run server
```
*Runs via `tsx server/index.ts`.*

### Start Frontend + Backend Together (recommended):
```bash
npm run dev
```
*Runs the Express API on port 5000 and Vite on port 5173 via `concurrently`.*

### Start Frontend Only (Port 5173):
```bash
npm run client
```

The Vite dev server automatically proxies all `/api/*` and `/uploads/*` requests directly to `http://localhost:5000`, providing a seamless development experience with zero CORS configuration required. **The backend must be running** (`npm run server` or `npm run dev`) or the UI falls back to browser `localStorage` only.

---

## 2. Real Backend REST API Endpoints

### Health & Uploads
- `GET /api/health` – Server health status, timestamp, and version check.
- `POST /api/upload` – Multipart/form-data file upload (photos, bills) with static URL resolution at `/uploads/<filename>`.
- `POST /api/upload-base64` – Base64 audio voice note and image decoder with disk storage.

### Shops & Catalog
- `GET /api/shops` – List all physical branches (Shop 1 & Shop 2).
- `GET /api/shops/:id` – Fetch single branch configuration and operating hours.
- `GET /api/cakes` – Fetch public cake menu catalog.
- `GET /api/cakes/:id` – Individual cake design details.
- `POST /api/cakes` – Add new cake creation (Super Admin only).
- `PUT /api/cakes/:id` – Update price, sizes, or availability.
- `DELETE /api/cakes/:id` – Remove cake listing.

### Customer Orders & Quotations
- `GET /api/orders` – List orders (optional `?shopId=shop-1` or `?shopId=shop-2` filter).
- `GET /api/orders/:identifier` – Instant lookup by `orderNumber` (e.g. `VB-2610-101`), `id`, or `pickupQrToken`.
- `POST /api/orders` – Place new customer order (generates unique order number, pickup QR pass, and in-app alert).
- `PUT /api/orders/:id/status` – Update baking/pickup status with history logging.
- `PUT /api/orders/:id/quote` – Set price quotation on custom cake reference photo request.
- `PUT /api/orders/:id/quote-response` – Customer accepts or declines custom quotation.
- `POST /api/orders/:id/payments` – Record customer advance or final pickup payment.

### Expenses & Overheads
- `GET /api/expenses` – List private shop expenses (with shop filter).
- `POST /api/expenses` – Record daily expenses (milk, cleaning, utilities, packaging).

### Suppliers & Purchase Invoices (Auto-Inventory Sync)
- `GET /api/suppliers` – List suppliers with current payable balances.
- `POST /api/suppliers` – Add new supplier record.
- `GET /api/purchases` – List supplier purchase invoices.
- `POST /api/purchases` – **Atomically records invoice AND increments the receiving shop's inventory stock!**

### Inventory & Stock
- `GET /api/inventory` – Live ingredient & packaging stock levels (with low stock alert calculation).
- `PUT /api/inventory/:id/adjust` – Manual inventory quantity correction with reason audit logging.

### Staff & Reports
- `POST /api/auth/login` – Staff authentication with role and assigned shop enforcement.
- `GET /api/reports/summary` – Audited sales, expenses, liabilities, and gross profit estimates.
- `GET /api/notifications` – Real-time in-app order and stock alerts.
