-- 1. CREATE NEW TABLES FOR MVP

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    vendor VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status purchase_status DEFAULT 'Pending',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waste Logs
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    logged_by VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    adjustment_qty DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    approved_by VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure public access for MVP UI bridging
CREATE POLICY "Allow public access to purchase_orders" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "Allow public access to waste_logs" ON waste_logs FOR ALL USING (true);
CREATE POLICY "Allow public access to stock_adjustments" ON stock_adjustments FOR ALL USING (true);
CREATE POLICY "Allow public access to franchises" ON franchises FOR ALL USING (true);
CREATE POLICY "Allow public access to users" ON users FOR ALL USING (true);


-- 2. SEED FRANCHISES (Backbenchers Cafeteria Branches)
INSERT INTO franchises (id, code, name, location, is_active) VALUES 
('f1000000-0000-0000-0000-000000000001', 'BB-GHAT', 'Backbenchers Ghatkopar', 'Ghatkopar East, Mumbai', true),
('f2000000-0000-0000-0000-000000000002', 'BB-VILE', 'Backbenchers Vile Parle', 'Vile Parle, Mumbai', true),
('f3000000-0000-0000-0000-000000000003', 'BB-MULU', 'Backbenchers Mulund', 'Mulund West, Mumbai', true)
ON CONFLICT (code) DO NOTHING;


-- 3. SEED USERS (Skipped for MVP to avoid Supabase Auth conflicts)


-- 4. SEED HISTORICAL PURCHASE ORDERS (For Charts)
INSERT INTO purchase_orders (po_number, franchise_id, vendor, total_amount, status, date) VALUES 
('PO-2601-01', 'f1000000-0000-0000-0000-000000000001', 'Fresh Produce Co', 2400.00, 'Received', '2026-01-15'),
('PO-2602-01', 'f1000000-0000-0000-0000-000000000001', 'Dairy Suppliers Inc', 1398.00, 'Received', '2026-02-14'),
('PO-2603-01', 'f1000000-0000-0000-0000-000000000001', 'General Store Wholesale', 9800.00, 'Received', '2026-03-10'),
('PO-2604-01', 'f1000000-0000-0000-0000-000000000001', 'Fresh Produce Co', 3908.00, 'Received', '2026-04-20'),
('PO-2605-01', 'f1000000-0000-0000-0000-000000000001', 'Dairy Suppliers Inc', 4800.00, 'Received', '2026-05-05'),
('PO-2606-01', 'f1000000-0000-0000-0000-000000000001', 'Fresh Produce Co', 3800.00, 'Received', '2026-06-12'),
('PO-2607-01', 'f1000000-0000-0000-0000-000000000001', 'General Store Wholesale', 4300.00, 'Pending', '2026-07-01') ON CONFLICT (po_number) DO NOTHING;


-- 5. SEED HISTORICAL DAILY STOCK (For Charts)
-- (Using dummy product '4704be3f-fff5-4f35-8585-5391d05b8a18' - KANDA PATTA just to have chart data)
INSERT INTO daily_stock (date, franchise_id, product_id, opening_stock, purchase, consumption, waste, closing_stock, status) VALUES 
('2026-07-01', 'f1000000-0000-0000-0000-000000000001', '4704be3f-fff5-4f35-8585-5391d05b8a18', 100, 50, 40, 2, 108, 'Approved'),
('2026-07-08', 'f1000000-0000-0000-0000-000000000001', '4704be3f-fff5-4f35-8585-5391d05b8a18', 108, 0, 45, 5, 58, 'Approved'),
('2026-07-15', 'f1000000-0000-0000-0000-000000000001', '4704be3f-fff5-4f35-8585-5391d05b8a18', 58, 60, 50, 1, 67, 'In Progress')
ON CONFLICT (date, franchise_id, product_id) DO NOTHING;


-- 6. SEED WASTE LOGS
INSERT INTO waste_logs (franchise_id, product_id, quantity, reason, logged_by, date) VALUES 
('f1000000-0000-0000-0000-000000000001', '4704be3f-fff5-4f35-8585-5391d05b8a18', 2.0, 'Spoiled', 'Downtown Manager', '2026-07-01'),
('f1000000-0000-0000-0000-000000000001', '88f88156-2bd2-4703-87e7-7d92378fd34e', 1.5, 'Expired', 'Downtown Manager', '2026-07-05');


-- 7. SEED STOCK ADJUSTMENTS
INSERT INTO stock_adjustments (franchise_id, product_id, adjustment_qty, reason, approved_by, date) VALUES 
('f1000000-0000-0000-0000-000000000001', '4704be3f-fff5-4f35-8585-5391d05b8a18', -5.0, 'Audit correction', 'System Super Admin', '2026-07-10');

