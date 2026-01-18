-- Checklist Templates
CREATE TABLE checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Template',
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Checklist Template Items
CREATE TABLE checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid REFERENCES checklist_templates(id) ON DELETE CASCADE,
  content text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Page Templates (rich text documents)
CREATE TABLE page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Template',
  description text,
  content text, -- Rich text/HTML content
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Templates (bundles checklists and pages)
CREATE TABLE project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Template',
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link project templates to checklist templates
CREATE TABLE project_template_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id uuid REFERENCES project_templates(id) ON DELETE CASCADE,
  checklist_template_id uuid REFERENCES checklist_templates(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  UNIQUE(project_template_id, checklist_template_id)
);

-- Link project templates to page templates
CREATE TABLE project_template_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id uuid REFERENCES project_templates(id) ON DELETE CASCADE,
  page_template_id uuid REFERENCES page_templates(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  UNIQUE(project_template_id, page_template_id)
);

-- Project Pages (actual pages created from templates for a project)
CREATE TABLE project_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to manage templates
CREATE POLICY "Authenticated users can view checklist templates" ON checklist_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create checklist templates" ON checklist_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update checklist templates" ON checklist_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete checklist templates" ON checklist_templates
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage checklist template items" ON checklist_template_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view page templates" ON page_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create page templates" ON page_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update page templates" ON page_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete page templates" ON page_templates
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view project templates" ON project_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create project templates" ON project_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project templates" ON project_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project templates" ON project_templates
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage project template checklists" ON project_template_checklists
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage project template pages" ON project_template_pages
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Project members can view project pages" ON project_pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = project_pages.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_pages.project_id AND created_by = auth.uid())
  );

CREATE POLICY "Project members can manage project pages" ON project_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = project_pages.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_pages.project_id AND created_by = auth.uid())
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checklist_template_timestamp
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_template_timestamp();

CREATE TRIGGER update_page_template_timestamp
  BEFORE UPDATE ON page_templates
  FOR EACH ROW EXECUTE FUNCTION update_template_timestamp();

CREATE TRIGGER update_project_template_timestamp
  BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION update_template_timestamp();

CREATE TRIGGER update_project_page_timestamp
  BEFORE UPDATE ON project_pages
  FOR EACH ROW EXECUTE FUNCTION update_template_timestamp();
