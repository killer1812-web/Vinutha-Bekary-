-- ==============================================================================
-- VINUTHA BAKERY - SEED DATA FOR DEMO & PRODUCTION BOOTSTRAP
-- Populates default shops, categories, cakes, suppliers, and inventory
-- ==============================================================================

-- 1. Insert Shops
INSERT INTO shops (id, name, code, tagline, address, phone, whatsapp, counter_poster_title, operating_hours, is_active)
VALUES
('shop-1', 'Vinutha Bakery – Main Bazaar Branch', 'SHOP-1', 'Handcrafted Celebration Cakes & Daily Fresh Oven Bakes', '#42, Main Bazaar Road, Near Gandhi Circle', '+91 98450 12345', '+91 98450 12345', 'Scan to View Fresh Cakes & Order Instantly', '7:30 AM - 10:30 PM', true),
('shop-2', 'Vinutha Bakery – Station Road Branch', 'SHOP-2', 'Chilled Ice Cakes, Pastries & Custom Celebrations', '#18, Railway Station Road, Opposite Bus Stand', '+91 98450 67890', '+91 98450 67890', 'Scan Counter QR to Order from Station Road Branch', '8:00 AM - 10:00 PM', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- 2. Insert Cake Categories
INSERT INTO cake_categories (name, slug, description, badge, sort_order)
VALUES
('Normal Cakes', 'normal-cakes', 'Classic sponge, fruit, and butter cakes baked fresh daily', 'Daily Fresh', 1),
('Ice Cakes', 'ice-cakes', 'Chilled, melt-in-mouth creamy cakes with fresh fruit and velvety frosting', 'Bestseller', 2),
('Birthday Cakes', 'birthday', 'Vibrant themed celebration cakes with custom candles, macarons, and names', 'Celebration', 3),
('Anniversary Cakes', 'anniversary', 'Romantic heart-shaped and bespoke designer anniversary treats', 'Romantic', 4),
('Custom Orders', 'custom', 'Upload your photo or voice note and let our master bakers craft your dream cake', 'Tailored', 5)
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, gst_number, balance)
VALUES
('Sri Lakshmi Dairy Supplies', 'Ramesh Kumar', '+91 94480 11223', 'lakshmi.dairy@gmail.com', 'APMC Yard, Plot 4, Wholesale Market', '29ABCDE1234F1Z5', 14500.00),
('Royal Cocoa & Chocolates Co.', 'Anand Varma', '+91 98860 33445', 'orders@royalcocoa.com', 'Industrial Area, Phase 2', '29FGHIJ5678K1Z2', 8200.00),
('Premier Bakery Flour Mills', 'Suresh Patel', '+91 91122 55667', 'premierflour@gmail.com', 'Grain Market Road, Shop 12', '29KLMNO9012P1Z8', 0.00),
('Bloom Eco Packaging', 'Divya Nair', '+91 97755 77889', 'contact@bloompack.in', 'Ring Road, Sector 3', '29PQRST3456U1Z9', 3200.00)
ON CONFLICT DO NOTHING;
