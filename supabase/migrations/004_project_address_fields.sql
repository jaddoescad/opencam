-- Add detailed address fields to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Canada';

-- Update existing address column to be computed or keep for backward compatibility
-- We'll keep the 'address' column for display purposes
