# Vinutha Bakery – Complete Website, Mobile PWA & Two-Shop Management System

A full-stack, production-ready digital platform built for **Vinutha Bakery**, featuring:

- **Customer Website & Installable PWA:** Mobile-first, responsive on Android, iPhone, iPad, and desktop.
- **Two-Shop Counter QR System:** Unique counter QR codes for **Shop 1 (Main Bazaar Branch)** and **Shop 2 (Station Road Branch)** with printable high-resolution A4 posters.
- **Cake Catalog & Ordering:** Dedicated categories for **Normal Cakes** and chilled **Ice Cakes**, size selection with dynamic pricing, flavours, decorations, custom message piping, and **microphone voice note recording**.
- **Customer Custom Design Uploads:** Upload reference cake photos from phone gallery, submit custom concepts, and receive price quotations from the master baker.
- **Order Tracking:** Track baking progress using unique Order Number (`VB-XXXX-XXX`) and phone verification with counter pickup QR code passes.
- **Super Admin (Owner) Portal:** Multi-shop view selector (`All Shops`, `Shop 1`, `Shop 2`), financial performance comparisons, custom cake quotation reviews, product catalog manager, and CSV exports.
- **Role-Based Shop Staff Dashboards:** Strict shop data isolation (Shop 1 staff cannot access Shop 2 financials or owner settings).
- **Automated Inventory & Purchases:** Recording supplier purchase invoices automatically increments the receiving shop's inventory stock and logs movements.
- **Staff Counter QR Scanner:** Camera-based pickup scanner with permission controls and manual lookup fallback.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open in browser:
http://localhost:5173/
```

### Pre-Configured Test Logins
Click **"Staff Portal"** in the top navigation bar:
- **Super Admin (Owner):** `owner` / `admin123`
- **Shop 1 Staff:** `staff1` / `staff123`
- **Shop 2 Staff:** `staff2` / `staff223`

---

## Documentation & Migration Files
- Complete setup & operations guide: [`SETUP_GUIDE.md`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/SETUP_GUIDE.md)
- Implementation plan: [Implementation Plan](file:///C:/Users/divakar%20v/.gemini/antigravity-ide/brain/fc623a8a-f646-49e3-9678-ec48e46bd60d/implementation_plan.md)
- PostgreSQL Schema: [`database/schema.sql`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/database/schema.sql)
- Row-Level Security & Triggers: [`database/rls_policies.sql`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/database/rls_policies.sql)
- Seed Data: [`database/seed_data.sql`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/database/seed_data.sql)
- Environment Variables Template: [`.env.example`](file:///c:/Users/divakar%20v/OneDrive/Desktop/vinutha%20bekary/.env.example)
