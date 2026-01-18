-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Members can view project members" ON project_members;
DROP POLICY IF EXISTS "Creator can manage members" ON project_members;

-- Fix Projects policy: check creator first, then members (without recursion)
CREATE POLICY "Users can view own and member projects" ON projects FOR SELECT USING (
  created_by = auth.uid()
  OR id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- Fix Project Members policies
CREATE POLICY "Users can view project members" ON project_members FOR SELECT USING (
  user_id = auth.uid()
  OR project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
  OR project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Project creator can manage members" ON project_members FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Project creator can delete members" ON project_members FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
);
