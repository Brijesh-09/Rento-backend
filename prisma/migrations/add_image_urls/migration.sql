-- Add image_urls column to products table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "image_urls" TEXT[] NOT NULL DEFAULT '{}';

-- Add image_urls column to product_variants table  
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "image_urls" TEXT[] NOT NULL DEFAULT '{}';
