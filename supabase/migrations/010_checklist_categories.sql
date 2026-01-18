-- Add category/section to checklist items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS response text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id);

-- Add category to checklist template items
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS category text;
