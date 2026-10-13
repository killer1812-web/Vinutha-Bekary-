-- ==============================================================================
-- VINUTHA BAKERY - PRODUCTION RELATIONAL POSTGRESQL SCHEMA FOR SUPABASE
-- Complete Multi-Shop Bakery Management, QR Ordering & Role-Based Access Control
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean drop if recreating
-- DROP TABLE IF EXISTS audit_logs, qr_codes, uploaded_documents, stock_movements, purchase_items, purchase_records, suppliers, inventory_stock, inventory_items, expenses, payments, orderstatushistory, customdesignrequests, order_items, orders, customers, cake_images, cakes, cake_categories, staffshopassignments, shops CASCADE;

-- 1. SHOPS (Two physical branches)
CREATE TABLE IF NOT EXISTS shops (
    id VARCHAR(50) PRIMARY KEY, -- 'shop-1', 'shop-2'
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    counter_poster_title VARCHAR(255) DEFAULT 'Scan to View Cakes & Order Instantly',
    operating_hours VARCHAR(100) DEFAULT '8:00 AM - 10:00 PM',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES & ROLES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'shop_admin', 'shop_staff')),
    assigned_shop_id VARCHAR(50) REFERENCES shops(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CAKE CATEGORIES
CREATE TABLE IF NOT EXISTS cake_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    badge VARCHAR(50),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CAKES (Menu catalog)
CREATE TABLE IF NOT EXISTS cakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES cake_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    available_sizes JSONB DEFAULT '[{"size": "0.5 kg", "price": 350}, {"size": "1 kg", "price": 650}, {"size": "2 kg", "price": 1200}]'::jsonb,
    flavours TEXT[] DEFAULT ARRAY['Vanilla', 'Chocolate', 'Black Forest', 'Butterscotch', 'Pineapple', 'Strawberry', 'Red Velvet'],
    decorations TEXT[] DEFAULT ARRAY['Whipped Cream Rosettes', 'Chocolate Drip', 'Fresh Cherries', 'Custom Name Plaque'],
    is_available BOOLEAN DEFAULT true,
    badge VARCHAR(50),
    is_special BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CAKE IMAGES
CREATE TABLE IF NOT EXISTS cake_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cake_id UUID REFERENCES cakes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 7. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    cake_id UUID REFERENCES cakes(id) ON DELETE SET NULL,
    cake_name VARCHAR(255) NOT NULL,
    category_slug VARCHAR(100),
    size VARCHAR(50) NOT NULL,
    flavour VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    advance_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'under_review', 'price_quoted', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
    fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
    delivery_address TEXT,
    required_date DATE NOT NULL,
    required_time VARCHAR(20) NOT NULL,
    custom_message VARCHAR(255),
    special_instructions TEXT,
    reference_photo_url TEXT,
    audio_note_url TEXT,
    is_custom_design BOOLEAN DEFAULT false,
    quoted_price NUMERIC(10, 2),
    quotation_status VARCHAR(50) DEFAULT NULL CHECK (quotation_status IN (NULL, 'pending', 'quoted', 'accepted', 'rejected')),
    pickup_qr_token VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);

-- 8. ORDER STATUS HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS orderstatushistory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    updated_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PAYMENTS (Customer advance / balance payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('advance', 'balance', 'full')),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
    transaction_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    received_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXPENSES (Private shop overheads & operational costs)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id),
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('raw_materials', 'utilities', 'packaging', 'cleaning', 'repairs', 'transport', 'other')),
    description TEXT,
    quantity NUMERIC(10, 2),
    unit_price NUMERIC(10, 2),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
    paid_by VARCHAR(255) NOT NULL,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON expenses(shop_id, date);

-- 11. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(50),
    balance NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. INVENTORY ITEMS (Per shop stock tracking)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('flour', 'dairy', 'sweeteners', 'chocolates', 'fruits', 'decorations', 'packaging', 'baking_supplies')),
    current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    unit VARCHAR(20) NOT NULL, -- 'kg', 'liters', 'packets', 'boxes'
    min_stock_level NUMERIC(10, 2) NOT NULL DEFAULT 5,
    purchase_price NUMERIC(10, 2) DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    last_restocked TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, name)
);
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory_items(shop_id);

-- 13. PURCHASE RECORDS (Supplier Bills)
CREATE TABLE IF NOT EXISTS purchase_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    invoice_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('paid', 'partially_paid', 'unpaid')),
    payment_method VARCHAR(50) NOT NULL,
    bill_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, invoice_number)
);

-- 14. PURCHASE ITEMS (Line items on supplier bills)
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchase_records(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0)
);

-- 15. STOCK MOVEMENTS (Auditable inventory transactions)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('purchase_in', 'usage_out', 'adjustment')),
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reference_id UUID, -- links to purchase_records.id or order.id
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. QR CODES REGISTRY
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_type VARCHAR(50) NOT NULL CHECK (code_type IN ('shop_counter', 'cake_item', 'order_pickup')),
    reference_id VARCHAR(100) NOT NULL, -- shop_id, cake_id, or order_token
    qr_payload TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    details TEXT,
    shop_id VARCHAR(50) REFERENCES shops(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(50) REFERENCES shops(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'quote', 'stock', 'bill', 'system')),
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
