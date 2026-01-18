-- Create table for checklist item photos
CREATE TABLE IF NOT EXISTS checklist_item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id uuid REFERENCES checklist_items(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES profiles(id),
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE checklist_item_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view photos for checklist items they have access to
CREATE POLICY "Users can view checklist item photos" ON checklist_item_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN checklists c ON c.id = ci.checklist_id
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE ci.id = checklist_item_photos.checklist_item_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN checklists c ON c.id = ci.checklist_id
    JOIN projects p ON p.id = c.project_id
    WHERE ci.id = checklist_item_photos.checklist_item_id AND p.created_by = auth.uid()
  )
);

-- Policy: Users can upload photos to checklist items they have access to
CREATE POLICY "Users can upload checklist item photos" ON checklist_item_photos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN checklists c ON c.id = ci.checklist_id
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE ci.id = checklist_item_photos.checklist_item_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN checklists c ON c.id = ci.checklist_id
    JOIN projects p ON p.id = c.project_id
    WHERE ci.id = checklist_item_photos.checklist_item_id AND p.created_by = auth.uid()
  )
);

-- Policy: Users can delete their own photos or project creators can delete any
CREATE POLICY "Users can delete checklist item photos" ON checklist_item_photos
FOR DELETE USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN checklists c ON c.id = ci.checklist_id
    JOIN projects p ON p.id = c.project_id
    WHERE ci.id = checklist_item_photos.checklist_item_id AND p.created_by = auth.uid()
  )
);
