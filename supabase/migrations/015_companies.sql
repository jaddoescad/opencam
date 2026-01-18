-- Create companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add company_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Add company_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Add company_id to invitations
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Add company_id to checklist_templates
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Add company_id to page_templates
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Add company_id to project_templates
ALTER TABLE project_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user belongs to a company
CREATE OR REPLACE FUNCTION is_same_company(check_company_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND company_id = check_company_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update handle_new_user function to handle company creation/assignment
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  invite_role text;
  invite_company_id uuid;
  new_company_id uuid;
  company_name_input text;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT role, company_id INTO invite_role, invite_company_id
  FROM invitations
  WHERE email = new.email AND status = 'pending'
  LIMIT 1;

  -- If user was invited, join the inviter's company
  IF invite_company_id IS NOT NULL THEN
    -- Insert profile with company_id from invitation
    INSERT INTO public.profiles (id, email, full_name, role, company_id)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      COALESCE(invite_role, 'Standard'),
      invite_company_id
    );
  ELSE
    -- Direct signup - create a new company
    company_name_input := new.raw_user_meta_data->>'company_name';

    -- Create company with user's provided name or default name
    INSERT INTO companies (name, created_by)
    VALUES (COALESCE(NULLIF(company_name_input, ''), 'My Company'), new.id)
    RETURNING id INTO new_company_id;

    -- Insert profile as Admin of the new company
    INSERT INTO public.profiles (id, email, full_name, role, company_id)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      'Admin',
      new_company_id
    );

    -- Update the company created_by (since profile now exists)
    UPDATE companies SET created_by = new.id WHERE id = new_company_id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for companies table
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "Admins can update their company" ON companies
  FOR UPDATE USING (
    id = get_user_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Drop and recreate RLS policies for profiles to scope by company
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view profiles in their company" ON profiles
  FOR SELECT USING (
    company_id = get_user_company_id()
    OR id = auth.uid()
  );

-- Drop and recreate RLS policies for projects to scope by company
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Creator can update project" ON projects;

CREATE POLICY "Users can view projects in their company" ON projects
  FOR SELECT USING (
    company_id = get_user_company_id()
  );

CREATE POLICY "Users can create projects in their company" ON projects
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id()
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update projects in their company" ON projects
  FOR UPDATE USING (
    company_id = get_user_company_id()
  );

CREATE POLICY "Users can delete projects in their company" ON projects
  FOR DELETE USING (
    company_id = get_user_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Standard'))
  );

-- Drop and recreate RLS policies for invitations to scope by company
DROP POLICY IF EXISTS "Admins can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON invitations;
DROP POLICY IF EXISTS "Invitations can be updated" ON invitations;

CREATE POLICY "Users can view invitations in their company" ON invitations
  FOR SELECT USING (
    company_id = get_user_company_id()
    OR status = 'pending'  -- Allow viewing pending invitations by token
  );

CREATE POLICY "Admins and Standard users can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Standard'))
  );

CREATE POLICY "Invitations can be updated" ON invitations
  FOR UPDATE USING (
    status = 'pending'
  );

-- Drop and recreate RLS policies for checklist_templates to scope by company
DROP POLICY IF EXISTS "Authenticated users can view checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Authenticated users can create checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Authenticated users can update checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Authenticated users can delete checklist templates" ON checklist_templates;

CREATE POLICY "Users can view checklist templates in their company" ON checklist_templates
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can create checklist templates in their company" ON checklist_templates
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update checklist templates in their company" ON checklist_templates
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete checklist templates in their company" ON checklist_templates
  FOR DELETE USING (company_id = get_user_company_id());

-- Drop and recreate RLS policies for page_templates to scope by company
DROP POLICY IF EXISTS "Authenticated users can view page templates" ON page_templates;
DROP POLICY IF EXISTS "Authenticated users can create page templates" ON page_templates;
DROP POLICY IF EXISTS "Authenticated users can update page templates" ON page_templates;
DROP POLICY IF EXISTS "Authenticated users can delete page templates" ON page_templates;

CREATE POLICY "Users can view page templates in their company" ON page_templates
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can create page templates in their company" ON page_templates
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update page templates in their company" ON page_templates
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete page templates in their company" ON page_templates
  FOR DELETE USING (company_id = get_user_company_id());

-- Drop and recreate RLS policies for project_templates to scope by company
DROP POLICY IF EXISTS "Authenticated users can view project templates" ON project_templates;
DROP POLICY IF EXISTS "Authenticated users can create project templates" ON project_templates;
DROP POLICY IF EXISTS "Authenticated users can update project templates" ON project_templates;
DROP POLICY IF EXISTS "Authenticated users can delete project templates" ON project_templates;

CREATE POLICY "Users can view project templates in their company" ON project_templates
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can create project templates in their company" ON project_templates
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update project templates in their company" ON project_templates
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete project templates in their company" ON project_templates
  FOR DELETE USING (company_id = get_user_company_id());

-- Data migration: Create companies for existing users without company_id
DO $$
DECLARE
  user_record RECORD;
  new_company_id uuid;
BEGIN
  FOR user_record IN
    SELECT id, email, full_name
    FROM profiles
    WHERE company_id IS NULL
  LOOP
    -- Create a company for this user
    INSERT INTO companies (name, created_by)
    VALUES (COALESCE(user_record.full_name, 'My Company') || '''s Company', user_record.id)
    RETURNING id INTO new_company_id;

    -- Update the user's profile with the new company_id and set as Admin
    UPDATE profiles
    SET company_id = new_company_id, role = 'Admin'
    WHERE id = user_record.id;

    -- Update all projects created by this user to belong to their company
    UPDATE projects
    SET company_id = new_company_id
    WHERE created_by = user_record.id AND company_id IS NULL;

    -- Update all invitations by this user to belong to their company
    UPDATE invitations
    SET company_id = new_company_id
    WHERE invited_by = user_record.id AND company_id IS NULL;

    -- Update all checklist_templates created by this user
    UPDATE checklist_templates
    SET company_id = new_company_id
    WHERE created_by = user_record.id AND company_id IS NULL;

    -- Update all page_templates created by this user
    UPDATE page_templates
    SET company_id = new_company_id
    WHERE created_by = user_record.id AND company_id IS NULL;

    -- Update all project_templates created by this user
    UPDATE project_templates
    SET company_id = new_company_id
    WHERE created_by = user_record.id AND company_id IS NULL;
  END LOOP;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_company_id ON checklist_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_page_templates_company_id ON page_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_company_id ON project_templates(company_id);
