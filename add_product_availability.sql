-- Add product availability feature to the products table
-- Run this in your Supabase SQL editor

-- Add is_available column to products table
ALTER TABLE public.products 
ADD COLUMN is_available boolean DEFAULT true;

-- Update any existing products to be available by default
UPDATE public.products 
SET is_available = true 
WHERE is_available IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN public.products.is_available IS 'Whether the product is currently available to clients'; 