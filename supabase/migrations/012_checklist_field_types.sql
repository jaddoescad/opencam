-- Add field type options to checklist items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS field_type text DEFAULT 'checkbox';
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS photos_required boolean DEFAULT false;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS options jsonb; -- For multiple choice options
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS rating_value integer; -- For rating type

-- Add field type options to checklist template items
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS field_type text DEFAULT 'checkbox';
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS photos_required boolean DEFAULT false;
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS options jsonb; -- For multiple choice options
