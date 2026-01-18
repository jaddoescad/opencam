-- Delete checklist items without a category (uncategorized items)
DELETE FROM checklist_items WHERE category IS NULL;

-- Delete checklist template items without a category
DELETE FROM checklist_template_items WHERE category IS NULL;

-- Make category required (NOT NULL)
ALTER TABLE checklist_items ALTER COLUMN category SET NOT NULL;
ALTER TABLE checklist_template_items ALTER COLUMN category SET NOT NULL;
