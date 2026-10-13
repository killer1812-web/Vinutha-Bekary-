# Vinutha Bakery – Complete Setup, Deployment & Operations Guide

Welcome to **Vinutha Bakery** – a complete, production-grade digital platform featuring:
- **Responsive Customer Website & Installable PWA** (Android, iPhone, iPad, Desktop).
- **Two-Shop Counter QR Code System** with printable high-resolution A4 posters.
- **Cake Customization & Ordering Engine** with audio voice recording and reference image uploads.
- **Custom Cake Quotation Flow** with customer review and approval.
- **Super Admin (Owner) Multi-Shop Dashboard** (All Shops, Shop 1, Shop 2).
- **Strict Role-Isolated Shop Staff Dashboards** (Shop 1 staff cannot access Shop 2 financials).
- **Automated Inventory & Stock Tracking** (saving supplier purchase invoices automatically increments shop stock).
- **Expense Tracking, Supplier Ledger, and Audited Financial Reports** with CSV exports.
- **Camera QR Scanner** for instant customer order pickup verification.

---

## 1. Quick Start & Local Development

The project is built with **Vite, React 18/19, TypeScript, and Tailwind CSS**.

### Prerequisites
- Node.js v18+ (tested on Node v25.1.0)
- npm v9+

### Steps
1. Navigate to the project folder:
   ```bash
   cd "vinutha bekary"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run local development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173/](http://localhost:5173/) in your mobile phone, tablet, or desktop browser.

---

## 2. Test Logins & Role Isolation

The platform includes built-in role-based credentials. Click **"Staff Portal"** in the top navigation bar and use either the credentials or the 1-click test role buttons:

| Role | Username | Password | Permissions & Shop Isolation |
| :--- | :--- | :--- | :--- |
| **Super Admin (Owner)** | `owner` | `admin123` | Full access to **both branches** (Shop 1 & Shop 2). Can toggle between "All Shops", "Shop 1", or "Shop 2", view all profits, set custom cake quotes, manage menu, create staff accounts, and view global supplier ledger. |
| **Shop 1 Staff** | `staff1` | `staff123` | **Strictly locked to Shop 1 (Main Bazaar Branch)**. Can manage Shop 1 orders, record Shop 1 daily expenses, enter Shop 1 supplier purchase bills, view Shop 1 stock, and scan pickup QR codes. **Blocked from viewing Shop 2 financials or owner settings.** |
| **Shop 2 Staff** | `staff2` | `staff223` | **Strictly locked to Shop 2 (Station Road Branch)**. Operates strictly within Shop 2. Cannot view Shop 1 data or combined business profits. |

---

## 3. Two-Shop Counter QR System & Printable Posters

### How the Counter QR Code Works
1. Place a printed counter QR code at the billing counter of:
   - **Shop 1:** Vinutha Bakery – Main Bazaar Branch (`?shop=shop-1`)
   - **Shop 2:** Vinutha Bakery – Station Road Branch (`?shop=shop-2`)
2. When customers walk into the shop and point their standard mobile camera (iPhone Camera app or Android Google Lens) at the code, it opens the bakery web application.
3. The customer's device **automatically preselects that physical branch** for ordering and pickup.
4. No account creation or app store installation is required for customers to browse prices or place orders.

### Printing A4 Counter Posters
1. Open the website and click **"Shop Counter QR"** in the top bar.
2. Select the desired shop (Shop 1 or Shop 2).
3. Click **"Print A4 Poster"**.
4. The system opens the print-ready view styled specifically for standard A4 paper with:
   - Vinutha Bakery Gold-embellished branding
   - Tagline: *"Scan to View Fresh Cakes & Order Instantly"*
   - High-Resolution QR code
   - Physical branch address, operating hours, phone, and WhatsApp contact.
5. Click **"Print Counter Poster (A4)"** to print directly to your counter printer, or save as PDF.

---

## 4. Database Setup & Supabase Migration

The codebase features a **dual-mode architecture**:
- **Out-of-the-box local mode:** Runs immediately with rich relational data and persistent `localStorage` synchronization.
- **Production Supabase mode:** Ready-to-execute PostgreSQL schemas with Row-Level Security (RLS) policies.

### Setting up Supabase PostgreSQL:
1. Create a free account at [Supabase](https://supabase.com) and create a new project named `vinutha-bakery`.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Execute the SQL scripts in this exact order:
   - Run [`database/schema.sql`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/database/schema.sql) to create all 18 relational tables, constraints, foreign keys, and indexes.
   - Run [`database/rls_policies.sql`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/database/rls_policies.sql) to enable Row-Level Security and the automatic inventory stock update trigger.
   - Run [`database/seed_data.sql`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/database/seed_data.sql) to populate default branches, cake categories, and initial suppliers.
4. In **Storage > Buckets**, create 3 buckets:
   - `cake-photos` (Public)
   - `customer-uploads` (Public or restricted)
   - `supplier-invoices` (Private to authenticated staff)
5. Copy your project credentials from **Project Settings > API** into `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

---

## 5. Automated Inventory Stock Integration

When shop staff record a supplier purchase bill in the **"Supplier Invoices & Bills"** tab:
1. Staff enter the invoice number, receiving shop, supplier, and line items (e.g., 20 kg Cake Flour @ ₹42/kg).
2. Upon clicking **"Save Bill & Increment Stock"**, the system:
   - Calculates subtotal, tax, and outstanding supplier balance.
   - **Automatically increments** that specific shop's matching inventory item quantity.
   - Logs an auditable entry in `stock_movements`.
   - Prevents double-counting when reviewing past bills.
3. If an item drops below its `minStockLevel`, the system immediately displays an amber **"Low Stock Alert"** banner across the owner and staff dashboards.

---

## 6. Progressive Web App (PWA) & Mobile Installation

The application includes:
- **`manifest.webmanifest`** with branding, icons, and standalone display mode.
- **Service Worker (`public/sw.js`)** providing asset caching and offline fallback.
- **Android / Chrome:** Automatic install banner prompting the customer to add "Vinutha Bakery" to their home screen with 1 tap.
- **iPhone / iOS Safari:** Built-in modal guiding the customer to tap the Safari Share button and select *"Add to Home Screen"*.

### Path to Native Android (Google Play) & iOS (App Store)
If native packaging is required:
1. Install Capacitor in the project:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   npx cap init "Vinutha Bakery" "com.vinuthabakery.app"
   ```
2. Build the production web bundle:
   ```bash
   npm run build
   ```
3. Add native platforms:
   ```bash
   npx cap add android
   npx cap add ios
   ```
4. Open Android Studio / Xcode to build the signed APK/AAB or IPA:
   ```bash
   npx cap open android
   ```
*(Note: Publishing to Google Play requires a Google Play Console account with a one-time $25 fee; Apple App Store requires an Apple Developer Account with a $99/year fee).*

---

## 7. External Integrations Checklist

| Service | Status | Configuration Steps Required |
| :--- | :--- | :--- |
| **Camera QR Scanner** | Ready | Uses browser Camera APIs (`navigator.mediaDevices` & `html5-qrcode`). Requires HTTPS in production. |
| **Audio Voice Recorder** | Ready | Uses HTML5 `MediaRecorder` API with live waveform & playback. Base64/blob storage ready. |
| **WhatsApp Direct Link** | Ready | Direct `https://wa.me/<phone>` link opens customer's WhatsApp with pre-filled message. |
| **WhatsApp Cloud API** | Optional | Requires Meta for Developers account with registered Business Phone ID if sending automated order status WhatsApp notifications. |
| **Supabase PostgreSQL** | Configured | Add your project URL & Anon Key to `.env` as documented in Section 4. |

---

## 8. Verification & Testing Checklist

- [x] **Customer Browsing:** Responsive hero banner, Normal Cakes and Ice Cakes categories, real cake photos.
- [x] **Cake Customization & Order:** Selected 1.0 kg size, flavour, entered customer name & phone, added custom cake message, submitted order, received confetti celebration and Order Number (`VB-XXXX-XXX`).
- [x] **Audio Voice Recording:** Live microphone recording with animated waveform, playback check, re-record, or file upload fallback.
- [x] **Custom Cake Upload:** Attached reference photo, described concept, selected preferred branch, received tracking number with "Under Review" status.
- [x] **Admin Quotation Flow:** Owner opened custom cake request, set quoted price, and customer approved quote via Track Order portal.
- [x] **Shop Counter QR Code:** Generated permanent counter QR codes for Shop 1 & Shop 2; previewed and printed A4 printable counter poster.
- [x] **Role Isolation:** Tested Super Admin (all branches) vs Shop 1 Staff (strictly isolated to Shop 1 data).
- [x] **Automated Stock Sync:** Recorded supplier invoice; verified automatic increment to inventory stock and low stock alert thresholds.
- [x] **Reports & Export:** Audited sales, expenses, and supplier balances; exported complete CSV report.
