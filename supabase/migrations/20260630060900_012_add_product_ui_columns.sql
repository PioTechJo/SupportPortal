-- Add UI properties to the products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Backfill data for legacy products to match the old UI experience
UPDATE public.products SET description = 'Anti-Money Laundering Compliance Engine', display_order = 10, is_active = true WHERE product_code = 'goaml';
UPDATE public.products SET description = 'Data Warehouse & Analytics', display_order = 20, is_active = true WHERE product_code = 'dwh';
UPDATE public.products SET description = 'Financial Instruments & ECL Calculation', display_order = 30, is_active = true WHERE product_code = 'ifrs9';
UPDATE public.products SET description = 'Funds Transfer Pricing', display_order = 40, is_active = true WHERE product_code = 'ftp';
UPDATE public.products SET description = 'Central Bank Reporting Suite', display_order = 50, is_active = true WHERE product_code = 'regulatory';
