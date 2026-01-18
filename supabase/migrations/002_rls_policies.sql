-- Enable RLS on all tables
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table photos enable row level security;
alter table checklists enable row level security;
alter table checklist_items enable row level security;

-- Profiles: users can read all, update own
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Projects: members can view, creator can manage
create policy "Members can view projects" on projects for select using (
  exists (select 1 from project_members where project_id = id and user_id = auth.uid())
  or created_by = auth.uid()
);
create policy "Users can create projects" on projects for insert with check (auth.uid() = created_by);
create policy "Creator can update project" on projects for update using (created_by = auth.uid());

-- Project members: project members can view
create policy "Members can view project members" on project_members for select using (
  exists (select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid())
);
create policy "Creator can manage members" on project_members for all using (
  exists (select 1 from projects where id = project_id and created_by = auth.uid())
);

-- Photos: project members can view/upload
create policy "Members can view photos" on photos for select using (
  exists (select 1 from project_members where project_id = photos.project_id and user_id = auth.uid())
  or exists (select 1 from projects where id = photos.project_id and created_by = auth.uid())
);
create policy "Members can upload photos" on photos for insert with check (
  exists (select 1 from project_members where project_id = photos.project_id and user_id = auth.uid())
  or exists (select 1 from projects where id = photos.project_id and created_by = auth.uid())
);

-- Checklists: project members can manage
create policy "Members can view checklists" on checklists for select using (
  exists (select 1 from project_members where project_id = checklists.project_id and user_id = auth.uid())
  or exists (select 1 from projects where id = checklists.project_id and created_by = auth.uid())
);
create policy "Members can create checklists" on checklists for insert with check (
  exists (select 1 from project_members where project_id = checklists.project_id and user_id = auth.uid())
  or exists (select 1 from projects where id = checklists.project_id and created_by = auth.uid())
);

-- Checklist items: same as checklists
create policy "Members can manage checklist items" on checklist_items for all using (
  exists (
    select 1 from checklists c
    join project_members pm on pm.project_id = c.project_id
    where c.id = checklist_items.checklist_id and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from checklists c
    join projects p on p.id = c.project_id
    where c.id = checklist_items.checklist_id and p.created_by = auth.uid()
  )
);
