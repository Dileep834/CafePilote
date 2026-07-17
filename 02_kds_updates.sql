-- Kitchen Display System Updates
-- Run this in your Supabase SQL Editor

-- 1. Add kitchen_status to pos_orders
ALTER TABLE public.pos_orders 
ADD COLUMN kitchen_status VARCHAR(50) NOT NULL DEFAULT 'pending';

-- 2. Optional: Add a comment explaining the statuses
COMMENT ON COLUMN public.pos_orders.kitchen_status IS 'Tracks fulfillment: pending, preparing, ready, delivered';

-- Note: The pos_order_items table already has everything we need.
