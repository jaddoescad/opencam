-- Create photo_annotations table for storing editable annotation data
CREATE TABLE photo_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  annotation_data JSONB NOT NULL,  -- Fabric.js canvas JSON
  flattened_path TEXT,             -- Storage path for rendered image
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_photo_annotations_photo_id ON photo_annotations(photo_id);

-- Enable RLS
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: same access as photos (project members can view/manage)
CREATE POLICY "Members can view annotations" ON photo_annotations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM photos p
    JOIN project_members pm ON pm.project_id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM photos p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pr.created_by = auth.uid()
  )
);

CREATE POLICY "Members can create annotations" ON photo_annotations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM photos p
    JOIN project_members pm ON pm.project_id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM photos p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pr.created_by = auth.uid()
  )
);

CREATE POLICY "Members can update annotations" ON photo_annotations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM photos p
    JOIN project_members pm ON pm.project_id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM photos p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pr.created_by = auth.uid()
  )
);

CREATE POLICY "Members can delete annotations" ON photo_annotations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM photos p
    JOIN project_members pm ON pm.project_id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM photos p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.id = photo_annotations.photo_id AND pr.created_by = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_photo_annotations_updated_at
  BEFORE UPDATE ON photo_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
