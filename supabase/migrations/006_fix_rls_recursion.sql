-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own and member projects" ON projects;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Creator can update project" ON projects;
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project creator can manage members" ON project_members;
DROP POLICY IF EXISTS "Project creator can delete members" ON project_members;
DROP POLICY IF EXISTS "Members can view photos" ON photos;
DROP POLICY IF EXISTS "Members can upload photos" ON photos;
DROP POLICY IF EXISTS "Members can view checklists" ON checklists;
DROP POLICY IF EXISTS "Members can create checklists" ON checklists;
DROP POLICY IF EXISTS "Members can manage checklist items" ON checklist_items;

-- Create a security definer function to check project membership
CREATE OR REPLACE FUNCTION is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_creator(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND created_by = auth.uid()
  );
$$;

-- Profiles policies (simple)
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies (using security definer function)
CREATE POLICY "Users can view accessible projects" ON projects FOR SELECT USING (
  created_by = auth.uid() OR is_project_member(id)
);
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can update projects" ON projects FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Creators can delete projects" ON projects FOR DELETE USING (created_by = auth.uid());

-- Project members policies
CREATE POLICY "Users can view project members" ON project_members FOR SELECT USING (
  is_project_creator(project_id) OR is_project_member(project_id)
);
CREATE POLICY "Creators can add members" ON project_members FOR INSERT WITH CHECK (
  is_project_creator(project_id)
);
CREATE POLICY "Creators can remove members" ON project_members FOR DELETE USING (
  is_project_creator(project_id)
);

-- Photos policies
CREATE POLICY "Users can view project photos" ON photos FOR SELECT USING (
  is_project_creator(project_id) OR is_project_member(project_id)
);
CREATE POLICY "Users can upload photos" ON photos FOR INSERT WITH CHECK (
  is_project_creator(project_id) OR is_project_member(project_id)
);
CREATE POLICY "Users can delete own photos" ON photos FOR DELETE USING (
  uploaded_by = auth.uid()
);

-- Checklists policies
CREATE POLICY "Users can view checklists" ON checklists FOR SELECT USING (
  is_project_creator(project_id) OR is_project_member(project_id)
);
CREATE POLICY "Users can create checklists" ON checklists FOR INSERT WITH CHECK (
  is_project_creator(project_id) OR is_project_member(project_id)
);
CREATE POLICY "Users can delete checklists" ON checklists FOR DELETE USING (
  created_by = auth.uid()
);

-- Checklist items policies (check via checklist's project)
CREATE OR REPLACE FUNCTION get_checklist_project(checklist_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM checklists WHERE id = checklist_uuid;
$$;

CREATE POLICY "Users can view checklist items" ON checklist_items FOR SELECT USING (
  is_project_creator(get_checklist_project(checklist_id)) OR is_project_member(get_checklist_project(checklist_id))
);
CREATE POLICY "Users can manage checklist items" ON checklist_items FOR INSERT WITH CHECK (
  is_project_creator(get_checklist_project(checklist_id)) OR is_project_member(get_checklist_project(checklist_id))
);
CREATE POLICY "Users can update checklist items" ON checklist_items FOR UPDATE USING (
  is_project_creator(get_checklist_project(checklist_id)) OR is_project_member(get_checklist_project(checklist_id))
);
CREATE POLICY "Users can delete checklist items" ON checklist_items FOR DELETE USING (
  is_project_creator(get_checklist_project(checklist_id)) OR is_project_member(get_checklist_project(checklist_id))
);
