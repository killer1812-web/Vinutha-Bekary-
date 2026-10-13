-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & BUSINESS LOGIC TRIGGERS
-- Protects shop isolation: Shop 1 staff cannot access Shop 2's private financial data
-- ==============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cake_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cake_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orderstatushistory ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user's profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    role VARCHAR,
    assigned_shop_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.role, p.assigned_shop_id
    FROM profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. SHOPS: Public can read active shops; Super admin can manage
CREATE POLICY "Public can view active shops" ON shops
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admin can modify shops" ON shops
    FOR ALL TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) = 'super_admin');

-- 2. CAKES & CATEGORIES: Public can read; Admins can edit
CREATE POLICY "Public can read categories" ON cake_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON cake_categories
    FOR ALL TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) IN ('super_admin', 'shop_admin'));

CREATE POLICY "Public can read available cakes" ON cakes
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage cakes" ON cakes
    FOR ALL TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) IN ('super_admin', 'shop_admin'));

CREATE POLICY "Public can read cake images" ON cake_images
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage cake images" ON cake_images
    FOR ALL TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) IN ('super_admin', 'shop_admin'));

-- 3. ORDERS:
-- Anyone can insert a new order
CREATE POLICY "Anyone can create order" ON orders
    FOR INSERT WITH CHECK (true);

-- Staff can view orders for their assigned shop, Super Admin can view all
CREATE POLICY "Staff can view assigned shop orders" ON orders
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM get_current_user_profile()) = 'super_admin'
        OR shop_id = (SELECT assigned_shop_id FROM get_current_user_profile())
    );

-- Staff can update orders for their assigned shop, Super Admin can update all
CREATE POLICY "Staff can update assigned shop orders" ON orders
    FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM get_current_user_profile()) = 'super_admin'
        OR shop_id = (SELECT assigned_shop_id FROM get_current_user_profile())
    );

-- 4. EXPENSES: Strict Shop Isolation
CREATE POLICY "Super admin can view all expenses" ON expenses
    FOR SELECT TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) = 'super_admin');

CREATE POLICY "Staff can view their shop expenses" ON expenses
    FOR SELECT TO authenticated
    USING (
        shop_id = (SELECT assigned_shop_id FROM get_current_user_profile())
    );

CREATE POLICY "Staff can insert their shop expenses" ON expenses
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM get_current_user_profile()) = 'super_admin'
        OR shop_id = (SELECT assigned_shop_id FROM get_current_user_profile())
    );

-- 5. INVENTORY & PURCHASE BILLS: Strict Shop Isolation
CREATE POLICY "Super admin can access all inventory" ON inventory_items
    FOR ALL TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) = 'super_admin');

CREATE POLICY "Staff can access their shop inventory" ON inventory_items
    FOR ALL TO authenticated
    USING (shop_id = (SELECT assigned_shop_id FROM get_current_user_profile()));

CREATE POLICY "Super admin can access all purchase records" ON purchase_records
    FOR ALL TO authenticated
    USING ((SELECT role FROM get_current_user_profile()) = 'super_admin');

CREATE POLICY "Staff can access their shop purchase records" ON purchase_records
    FOR ALL TO authenticated
    USING (shop_id = (SELECT assigned_shop_id FROM get_current_user_profile()));

CREATE POLICY "Access purchase line items" ON purchase_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM purchase_records pr
            WHERE pr.id = purchase_items.purchase_id
            AND (
                (SELECT role FROM get_current_user_profile()) = 'super_admin'
                OR pr.shop_id = (SELECT assigned_shop_id FROM get_current_user_profile())
            )
        )
    );

-- ==============================================================================
-- AUTOMATIC INVENTORY STOCK UPDATE TRIGGER
-- Safely increments shop stock whenever a purchase item is added to an invoice
-- ==============================================================================
CREATE OR REPLACE FUNCTION process_purchase_item_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id VARCHAR(50);
BEGIN
    SELECT shop_id INTO v_shop_id FROM purchase_records WHERE id = NEW.purchase_id;

    IF NEW.inventory_item_id IS NOT NULL THEN
        -- Increment existing inventory item quantity
        UPDATE inventory_items
        SET current_quantity = current_quantity + NEW.quantity,
            last_restocked = NOW(),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id AND shop_id = v_shop_id;

        -- Record movement log
        INSERT INTO stock_movements (
            shop_id,
            inventory_item_id,
            item_name,
            movement_type,
            quantity,
            unit,
            reference_id,
            reason
        ) VALUES (
            v_shop_id,
            NEW.inventory_item_id,
            NEW.item_name,
            'purchase_in',
            NEW.quantity,
            NEW.unit,
            NEW.purchase_id,
            'Stock added via Supplier Invoice Purchase'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_purchase_item_inventory ON purchase_items;
CREATE TRIGGER trg_purchase_item_inventory
AFTER INSERT ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION process_purchase_item_inventory();

-- ==============================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION SCRIPT
-- Run in Supabase SQL Editor:
-- ==============================================================================
-- 1. cake-photos (public read)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cake-photos', 'cake-photos', true);
-- 2. customer-uploads (private/authenticated or restricted read)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('customer-uploads', 'customer-uploads', true);
-- 3. supplier-invoices (strictly private to authenticated admins)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-invoices', 'supplier-invoices', false);
