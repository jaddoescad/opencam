-- Create project_shares table for shareable gallery links
CREATE TABLE project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create index for fast token lookups
CREATE INDEX idx_project_shares_token ON project_shares(token);
CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);

-- Enable RLS
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares for projects they have access to
CREATE POLICY "Users can view project shares"
  ON project_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_shares.project_id
    )
  );

-- Policy: Admin and Standard users can create shares
CREATE POLICY "Admin and Standard users can create shares"
  ON project_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Standard')
    )
  );

-- Policy: Admin and Standard users can update shares (enable/disable)
CREATE POLICY "Admin and Standard users can update shares"
  ON project_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Standard')
    )
  );

-- Policy: Admin and Standard users can delete shares
CREATE POLICY "Admin and Standard users can delete shares"
  ON project_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Standard')
    )
  );
