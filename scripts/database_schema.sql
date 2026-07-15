-- CafePilot PostgreSQL Schema for Supabase

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('Super Admin', 'Admin', 'Franchise Owner', 'Staff');
CREATE TYPE inventory_status AS ENUM ('Pending', 'In Progress', 'Submitted', 'Approved', 'Locked');
CREATE TYPE purchase_status AS ENUM ('Pending', 'Received', 'Cancelled');

-- 2. Create Franchises Table
CREATE TABLE franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Users Table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Staff',
    franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    min_stock DECIMAL(10, 2) DEFAULT 0,
    max_stock DECIMAL(10, 2) DEFAULT 0,
    reorder_level DECIMAL(10, 2) DEFAULT 0,
    purchase_price DECIMAL(10, 2) DEFAULT 0,
    selling_price DECIMAL(10, 2) DEFAULT 0,
    gst DECIMAL(5, 2) DEFAULT 0,
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Current Inventory Table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_quantity DECIMAL(10, 2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(franchise_id, product_id)
);

-- 7. Create Daily Stock Updates Table
CREATE TABLE daily_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    opening_stock DECIMAL(10, 2) DEFAULT 0,
    purchase DECIMAL(10, 2) DEFAULT 0,
    consumption DECIMAL(10, 2) DEFAULT 0,
    waste DECIMAL(10, 2) DEFAULT 0,
    closing_stock DECIMAL(10, 2) DEFAULT 0,
    status inventory_status DEFAULT 'In Progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, franchise_id, product_id)
);

-- 8. Create Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users to masters
CREATE POLICY "Allow read access to all authenticated users for franchises" ON franchises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users for users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users for categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users for products" ON products FOR SELECT TO authenticated USING (true);

-- Allow full access to admins/super admins (simplified for MVP)
CREATE POLICY "Allow full access for authenticated users (MVP)" ON franchises FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users (MVP)" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users (MVP)" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users (MVP)" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users (MVP)" ON inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users (MVP)" ON daily_stock FOR ALL TO authenticated USING (true);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_franchises_modtime BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_daily_stock_modtime BEFORE UPDATE ON daily_stock FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'Super Admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile in public.users when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- Seed Data for CafePilot

-- Categories
INSERT INTO categories (id, name) VALUES ('a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'FRESH FRUIT / FROZEN');
INSERT INTO categories (id, name) VALUES ('045d6172-2938-4471-bd5a-b5702e2154c9', 'VEGITABLE');
INSERT INTO categories (id, name) VALUES ('17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'SYRUP');
INSERT INTO categories (id, name) VALUES ('57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'GENRAL STORE');
INSERT INTO categories (id, name) VALUES ('f9ec41e1-bdec-4613-85b1-43043ae55f50', 'BREAD');
INSERT INTO categories (id, name) VALUES ('a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'FROZEN');
INSERT INTO categories (id, name) VALUES ('08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'COLDRINK WATER');
INSERT INTO categories (id, name) VALUES ('64f197d7-0cc0-4703-9c63-7c6a923578f8', 'SOUS');
INSERT INTO categories (id, name) VALUES ('20040db8-5c00-44b7-9055-cd1dd8df51e2', 'DAIRY PRODUCT');
INSERT INTO categories (id, name) VALUES ('5c47acb4-24cb-4ead-92d3-91657a6d5746', 'POWDER');

-- Products
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d5843bf6-9b4d-41f1-9889-da409ccadad4', 'PRD-001', 'WATERMELON', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0d323c16-a901-48ca-b866-0062ddf45f9a', 'PRD-002', 'RED YELLOW GREEN', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e543049f-f4a1-4c9c-b1f7-3eca648e4244', 'PRD-003', 'BLUE CORECO', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('89e548d0-50f8-4eff-91ed-244e5915ebdf', 'PRD-004', 'LIME SIZZLING', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('569fb6f3-1f5c-4984-b802-c198aa438fcb', 'PRD-005', 'PIZZA BASE', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e769fe16-bb2c-45ee-8772-48a89ac93648', 'PRD-006', 'PANEER TIKKA MOMS', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('cd55d601-832b-4ba3-a9df-e67731f2d133', 'PRD-007', 'SODA', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0295ee95-d320-42db-99d4-69b9bcf1e3d9', 'PRD-008', 'WHITE CHEESE', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('fca890be-02e2-40c9-b8a9-7bf4ec36080b', 'PRD-009', 'MOZRILLA', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0721c885-b449-4cf2-8b8f-d9840bddb66d', 'PRD-010', 'FR', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e6282fa6-e068-4a2a-919a-2d637121eee7', 'PRD-011', 'PINAPPLE', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('73794699-418a-41b2-b912-2ea786c09f5b', 'PRD-012', 'BABY CORN', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('7cead00c-b018-4d65-b836-afd38ba7070b', 'PRD-013', 'PEACH APPRICOT', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('09f5b57a-2ace-480f-a07a-4ab86eb0b1f1', 'PRD-014', 'PERI PERI', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2c609c93-6cad-4471-a6b3-dbe87550753f', 'PRD-015', 'GARLIC BREAD', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('46e59b5f-357d-4a30-8563-d7ead67ed46f', 'PRD-016', 'SECHWAN MOMO', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f124eddf-beab-4136-87b2-18a809e1cf87', 'PRD-017', 'COKE', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4b8ec016-53c7-4f92-89ac-1331bb323f9b', 'PRD-018', 'PIZZA SOUS', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3d38509e-bd95-445b-bc8d-0791935f3ca3', 'PRD-019', 'Cheese block', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1b45ffc1-2989-461c-a7df-5c31cbbca4e8', 'PRD-020', 'COFFE', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('caf371ec-fbea-4c13-b5ac-8b4d1d68feed', 'PRD-021', 'American corn', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('fae1d7a4-019e-499f-a2d6-8ca1b98835af', 'PRD-022', 'KALA KHATTA', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('833823d8-a310-40be-b1d2-45be7ef47848', 'PRD-023', 'JAIN PERI PERI', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('cfe614f5-36cf-4e40-add6-e8716322cc58', 'PRD-024', 'BURGER BUN', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6aa1ebb4-7743-4853-8f6c-9d14f95394b3', 'PRD-025', 'VEG MOMO', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('23398ea5-d363-487c-8583-3a150d5e078d', 'PRD-026', 'WATER', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2af94898-06c0-4151-b2e7-9090e1ab6ae4', 'PRD-027', 'TANDOORI', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f646285b-bd4d-44eb-a489-44e018d03c90', 'PRD-028', 'BUTTER', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('fe38dd8d-86e0-438a-9a98-7ba2e8677149', 'PRD-029', 'CHOCOLATE', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1ad58189-5ccb-448d-8497-1c8859502d0e', 'PRD-030', 'MANGO F', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('b7f38a41-ef98-404b-83b3-39ee1718314c', 'PRD-031', 'MUSHROOM', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('cf40df56-f7ac-403d-9386-0ab8467a7234', 'PRD-032', 'ORANGE CRUSH', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2ce51992-975a-4e7a-a57e-251b49d85b10', 'PRD-033', 'AROMATIC', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('c4703676-7103-4630-b988-969cd13d024f', 'PRD-034', 'GARLIC LOAF', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e504439e-0142-4042-a316-069fe7042004', 'PRD-035', 'ALOO MASALA PATTY', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0bbf9898-8fcb-4c46-a090-d990df82f3ac', 'PRD-036', 'CHIPOTLE', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('29b56ca3-3d2c-4d23-857b-d2d69f2e9d9e', 'PRD-037', 'TONED MILK', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('ee100a8b-97fa-4f3e-bac8-d895fddf3ca7', 'PRD-038', 'DRY FRUIT', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('b0db461e-bf62-498a-9019-057e91a1af74', 'PRD-039', 'STRWABERRY F', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('29a67601-f48d-412e-8402-28134fc57b2c', 'PRD-040', 'MINT', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('548dfcde-8ecf-41fb-91b5-a41c5ae5cb39', 'PRD-041', 'STRWBERRY', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('df88f2dd-38c0-4772-81bf-242d616b6b0e', 'PRD-042', 'KIT KAT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d4741755-c366-4323-93d5-da0faf18cc20', 'PRD-043', 'SUPER VEG BURGER', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('354bb9aa-c4a7-4618-b09f-90b8533d4f84', 'PRD-044', 'BOBA', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1f368e9c-50cd-4922-8ca5-e91d9831cafa', 'PRD-045', 'BBQ', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e5b1e4b9-8108-41f9-82ab-5958c4cbddda', 'PRD-046', 'PANEER', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e7e0c6fc-7854-4c3a-a059-6163b7ea7ab3', 'PRD-047', 'KALA JAMUN', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('dbc90253-4200-41f3-aa72-625b4b8c4a53', 'PRD-048', 'DHANIYA', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('07359fcd-7e1b-4cea-af72-2ea7c859d357', 'PRD-049', 'GREEN APPLE', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('223d4e44-80a9-4aeb-8b18-109fd19d2854', 'PRD-050', 'NUTTELLA', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('082707c7-3368-4d18-ab25-680e3934bec5', 'PRD-051', 'GENRAL STORE', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0a3252ad-58bd-4a9d-9a2a-3e8e5fb3c43c', 'PRD-052', 'PATATO WEDGES', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3e90a60c-2f56-4013-9292-8d3581505c41', 'PRD-053', 'STRWBERRY', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('89557de2-c11d-4a76-aea3-75441c72c25e', 'PRD-054', 'SCHEZWAN STIR DIP FRY', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('50e70d6f-7f8b-4d6c-b202-b5796dfe48a6', 'PRD-055', 'Pav', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('89c25cc3-40ab-4230-8289-795f8ad445b1', 'PRD-056', 'BROWNI', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6f0165f8-96a8-47c2-9c79-0f06f07944aa', 'PRD-057', 'FROZEN MILK', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('568b50cf-1f4e-4484-b2bc-898d6ad1ab63', 'PRD-058', 'Green chilli', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('62acdaa0-2ea2-4d63-b88b-557daa944765', 'PRD-059', 'BLUE BERRY', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('feb34fb1-d2d5-440a-ad67-66a3acf942ef', 'PRD-060', 'PANNE PASTA', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('48f76d46-d74e-4ce2-83f1-6fa32a2ef67a', 'PRD-061', 'CHAAT MASALA', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a9b134a5-68d0-4316-8191-612a6712e3c5', 'PRD-062', 'FRIES', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('23ea322f-eeb4-468e-ab23-f7c36cf3c6dd', 'PRD-063', 'CHOCOLATE', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('482d082d-8fc3-492b-b283-341068b4d1ed', 'PRD-064', 'TAMATO', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('c8f6200f-a9af-443f-8271-ff65ad2978a0', 'PRD-065', 'FILLER CHEES', '20040db8-5c00-44b7-9055-cd1dd8df51e2', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1c4feabb-3207-4035-949d-a129628e9384', 'PRD-066', 'DARK COMPOUND', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('edc9d465-99c9-46c8-b3e6-fd28dbe4bfea', 'PRD-067', 'GARLIC', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('dc34be52-f883-475d-bd63-0e81c42478e7', 'PRD-068', 'GUAVA', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('beb5ca51-6fe9-4871-9238-78ecfbb1e822', 'PRD-069', 'MICRONI PASTA', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('449d7708-d1d1-4870-ba5d-a4dd151ca8f7', 'PRD-070', 'OREO BISCUIT', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2c1da71e-8ba1-4a1f-8c20-896187fcc10c', 'PRD-071', 'CHEES CORN NUGGETS', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('649534df-adfa-4394-9b00-bfe836d50de8', 'PRD-072', 'BLUE BERRY', '08a53106-e1b9-4916-9be4-e8f3b8af42f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8cf2b243-3e06-4605-9ad8-ecc1a365cd00', 'PRD-073', 'SALSA', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0451c3e8-b0a0-4a83-9a34-2cd486bb5b40', 'PRD-074', 'CHOCOCHIPS', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3b1ca883-2af2-43be-b00a-9d779eb8f045', 'PRD-075', 'TAMATO', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2f5ea209-492b-4755-9090-675ca4e79190', 'PRD-076', 'Hazelnut syrup', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f47f90f9-1124-495e-b070-f81e880d1eab', 'PRD-077', 'OREGANO /SECHET', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('fb5d7620-bb9a-42e5-ac93-8ca4537f0e53', 'PRD-078', 'MAGGI JAIN/REGULAR', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6097df9f-fbd4-4fba-b363-8b8abf948fd1', 'PRD-079', 'CHEESE POPPERS', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('62efd6ee-a5d3-4c4c-99e8-882d1585951e', 'PRD-080', 'MAYONIES', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('422411ef-2740-44a6-a975-f5c8141325a9', 'PRD-081', 'CHOCO STAND', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('57b01869-130b-4a27-9538-63fd16ff32a1', 'PRD-082', 'ICE CREAM', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('7085fdab-ddf8-4e15-9f11-622f1d0eb2fe', 'PRD-083', 'ONION', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('857b8aee-7510-469a-988a-78f97df0dfe8', 'PRD-084', 'Caremal syrup', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('37e87f4d-6cea-4421-b3c5-7e5dbd596c40', 'PRD-085', 'CHILLI FLEX /SECHET', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f599073c-ff0a-4a02-807b-7244b5295fc9', 'PRD-086', 'CHIILI COUS CHINESH', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4707ff3d-e2ae-4249-b361-27e674986e35', 'PRD-087', 'CHEESE LAVA BURGER', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('89fbb235-b60f-4edb-8141-9f78fdb915db', 'PRD-088', 'CHILLI GARLIC', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1523c936-8909-4852-967f-5f24a547cb53', 'PRD-089', 'WALLNET BROWNI', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2b7385d6-fc1a-43d1-b27b-2f99a506dffd', 'PRD-090', 'VANILLA', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('5c4149b5-8679-4c28-994a-d4ac31fd0ee9', 'PRD-091', 'LATIVES', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a528d02b-8bb4-48ed-b046-bca986d705df', 'PRD-092', 'Cookies syrup', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('39e6b62c-480f-4c61-8dd3-8e3feedac69e', 'PRD-093', 'WHITE PEPPER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('86531462-5081-45ee-adcb-4a0528f2a3c8', 'PRD-094', 'SOYA SOUS CHINESH', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8b47e807-646b-4783-b08a-ec39e3b4c75b', 'PRD-095', 'PANNER PATTY', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8bdd1424-0874-439b-bd13-ac68fabb6312', 'PRD-096', 'MAKHNI', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('eea02d06-8641-43df-bdc2-4c7f68be76c1', 'PRD-097', 'CHOCOLATE', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('eb22da7b-b327-427f-b670-64dcfa547cd9', 'PRD-098', 'GOBHI', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('33af9b2d-451b-4172-aed3-7a5e171a10a8', 'PRD-099', 'MINT MOJITO', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('fc90cfcb-ce5e-4755-8409-52b02da712b8', 'PRD-100', 'BREAD CRUMB', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f66f1335-a6e5-40c5-aa60-812a9e54fe36', 'PRD-101', 'Maggi masala', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('471d10b2-5a0f-423b-bd42-e36bd12af89a', 'PRD-102', 'CIGAR ROLL', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('dfe047f7-139e-48fd-a799-042485208d64', 'PRD-103', 'Aloo tikki sauce', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4655c58b-067f-4af7-b35f-b56a4006a353', 'PRD-104', 'CHATNI', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8c818d5a-486f-499d-99ca-6708d6cb66e0', 'PRD-105', 'BLACK CURRENT', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e6227569-418b-4eef-81c0-d2bcc942915b', 'PRD-106', 'PASLI', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2a8fd495-391f-433f-873a-56d079de7b8f', 'PRD-107', 'MANGO CRUSH', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('28201e69-6e4a-4d77-8404-de9d9ae73997', 'PRD-108', 'SALT', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('c965d1af-d564-4b99-b127-9616a2b84a53', 'PRD-109', 'CHEESE CORN BALL', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('ae6effe3-c603-4750-92d3-d9d32a2114a2', 'PRD-110', 'Pizzza pasta jain', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('29265dee-3a84-4493-8cf1-887042670c56', 'PRD-111', 'GREEN CHATNI', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('16df0e16-19b2-4b3d-8110-14a82b84ca33', 'PRD-112', 'STRWBERRY', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('9d3b2b6c-f149-486f-9a5a-fa83e624e194', 'PRD-113', 'ADRAK', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('9cf512cc-7af6-4b7f-a16a-89438127ff4c', 'PRD-114', 'ROSE SYRUP', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('52e0f701-09f9-49de-bd96-6a9a734e3b9f', 'PRD-115', 'BLACK SALT', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('29d4766a-2a82-4f1d-b437-f87ee614c70e', 'PRD-116', 'AMERICAN STYLE MAYONIES', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('fb341dc2-3924-4a86-b55f-302187d9e627', 'PRD-117', 'RED CHATNI', '5c47acb4-24cb-4ead-92d3-91657a6d5746', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f1be609d-64f7-4a99-979b-a2807e4ff899', 'PRD-118', 'RAJBHOG', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8bd7e739-0554-42ff-921f-a3f5f97dbc81', 'PRD-119', 'GAJAR', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('cda0dd22-51ce-4a6c-a448-fc2477cc3adf', 'PRD-120', 'TABSCO', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('bb583fd3-b496-46b8-9ef7-398a6883a383', 'PRD-121', 'PACKAGING', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0e7e9c96-a846-4df6-a167-04d46f5e841e', 'PRD-122', 'RED CHILLI POWDER', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1f47b3b8-ef4e-4dcd-ac4b-12ee476f9acf', 'PRD-123', 'JAIN VEG PATTY', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('9fb63bc9-da24-4930-97a8-fe391039a8b4', 'PRD-124', 'SPICE GARLIC', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3386c803-8874-42c0-a1f2-8ceeff5cb9d8', 'PRD-125', 'ICE', 'a59a8644-8f77-4cbe-a1bd-489d5cad53b5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a01327f8-a5a2-4b0c-b4db-208591290424', 'PRD-126', 'BROCALI', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('61b1fd56-d45b-4056-9b17-e24147cee68e', 'PRD-127', 'BURGER STICK', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0a95e0db-6862-4e9e-a300-9e6a93167ea0', 'PRD-128', 'SUGAR', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2713ebc1-2a08-49a1-a7d9-eeed9da2f94e', 'PRD-129', 'JAIN VEG MOMO', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('33bd15a4-80c2-4a74-82fe-a42936f791cb', 'PRD-130', 'MOLTEN CHEES', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a7a2a2b0-68e7-42de-b93c-848b593c6832', 'PRD-131', 'LIME', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a1c85d98-51b6-42fc-b7be-168c96fce43f', 'PRD-132', 'REEAL JUICE', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('469bffda-6529-4fdc-ad61-990a2150e159', 'PRD-133', 'TISSUE BOX', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('679fc5ff-089c-42a0-b2bc-a3785f8ceaba', 'PRD-134', 'NACHOES', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('296e46a6-81e3-4112-afab-0a8f4da0b448', 'PRD-135', 'JAIN PANEER MOMO', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('ac1a10cf-f13f-434a-ba1e-7f823e2e784e', 'PRD-136', 'CHEESE SPRED', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4704be3f-fff5-4f35-8585-5391d05b8a18', 'PRD-137', 'KANDA PATTA', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('88f88156-2bd2-4703-87e7-7d92378fd34e', 'PRD-138', 'CRANBERRY', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('75f9df1b-443a-4a51-b621-3fcc2501b031', 'PRD-139', 'GARBAGE BAG', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1988f159-00d7-4066-b4d2-ce1e36619f94', 'PRD-140', 'DRY FRUIT', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0d68f3a8-6019-4fc6-b3e3-eb4f85dae2f7', 'PRD-141', 'JAIN PANEER CHEES MOMO', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a64e59da-b943-45ab-9909-0e9e318578c0', 'PRD-142', 'TOMATO KETUP SESE', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2fa68e86-611a-4d6a-9d20-9f9432b961b8', 'PRD-143', 'JUGNI', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('85350989-5174-429b-8667-f939ba662bac', 'PRD-144', 'ORANGE', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0229f4d2-602e-4ce7-a7dd-02c8d77abd0e', 'PRD-145', 'SENITIZER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6462eee8-3cea-4154-a292-a2fc5b460d94', 'PRD-146', 'KIT KAT CHOCOLATE', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('88c065fa-8ca3-4e43-a51c-dcdec6a841f5', 'PRD-147', 'JAIN FRIES', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3ad3fd28-c350-441d-b7b4-67cbe4c11e07', 'PRD-148', 'JAIN TOMATO KETUP SESE', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('776c6007-131b-411b-a0b4-784d5b47ae9e', 'PRD-149', 'CHINESH CABBAGE', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('c0a22cf8-a745-4285-bf4b-8db6b163a958', 'PRD-150', 'PINAPPLE', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('79937ad5-c569-4650-a2db-ca862e53202e', 'PRD-151', 'DISH WASHER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('54e465e5-7ed1-4579-9616-7d1f3237b5f7', 'PRD-152', 'KIT  KAT CRUSH', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3a03698a-1384-4c09-963b-15fdfc883c43', 'PRD-153', 'Chinese chilli sauce jain', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f147c379-c976-4c6d-b3cd-32203ddea7e9', 'PRD-154', 'RED CABBAGE', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e38bced2-ad38-49dd-bee2-86e2f5527083', 'PRD-155', 'FLOR CLEANER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d2f16b7d-9707-4db4-8a9b-25cae7a37168', 'PRD-156', 'HONEY', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('5a0de5f6-b4c3-4c96-80a2-4dc4e2e47dfc', 'PRD-157', 'Soya sauce jain', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('acca1b0f-a4a2-44d2-bdbb-756d81a675ca', 'PRD-158', 'PALAK', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('b359ffe6-4610-4b41-b683-84840e88fffb', 'PRD-159', 'FORK', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('57aab981-8fce-418d-8db2-28382b7c844e', 'PRD-160', 'RICE', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d7743ebf-927b-4601-9f0b-9d375fdc0e62', 'PRD-161', 'SCHEZWAN SAUCE JAIN', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('aac7b2b0-58ff-4a4d-b090-75a482ad6cd3', 'PRD-162', 'POKCHO', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a4836777-6d71-4836-a44b-39cba046873b', 'PRD-163', 'SPOON', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('24f4358f-74f5-4f81-bd8b-d3967bc4dadf', 'PRD-164', 'NOODLES', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8e1330e8-d1cc-41df-a543-b5648e682b23', 'PRD-165', 'BEENS', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('80dd9b7d-39cb-4cb1-861e-1569fcd86f61', 'PRD-166', 'STRAW ALL TYPE', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d6f666ec-0ff0-4dbc-93ae-8a4c069e2062', 'PRD-167', 'KACCHA BANANA', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8770402c-97a5-4c01-8b8f-876a159f68ca', 'PRD-168', 'PIZZA BOX', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('083f588c-1070-423c-a642-aa5c4874850d', 'PRD-169', '500ML RCT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4a682220-ba52-4039-8005-ee4da4507fba', 'PRD-170', '750ML RCT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6c639596-3dfe-4ff6-8ddb-a72be210c049', 'PRD-171', '500ML ROUND', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('9037e15f-e807-4132-8921-8b56d725c9c4', 'PRD-172', 'PARCEL BAG', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f3df26c8-b747-4a3d-a95c-c101c55d3f98', 'PRD-173', 'BURGER BOX', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('35090fbf-d26b-42b9-b612-2b359f5c7b0a', 'PRD-174', 'BUTTER PAPER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f38741b5-278e-41e2-92e1-eda6269061f1', 'PRD-175', 'HAIR NUT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6866fb86-4647-40a7-a96a-08d614354f2a', 'PRD-176', 'FOIL PAPER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('11055d96-c285-4793-a8d3-c094bfe8d832', 'PRD-177', 'CLEAN WRAP', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
