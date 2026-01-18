-- profiles (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_archived boolean default false
);

-- project_members (users added to projects)
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  added_at timestamptz default now(),
  unique(project_id, user_id)
);

-- photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  storage_path text not null,
  caption text,
  created_at timestamptz default now()
);

-- checklists
create table checklists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- checklist_items
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references checklists(id) on delete cascade,
  content text not null,
  is_completed boolean default false,
  completed_by uuid references profiles(id),
  completed_at timestamptz,
  position integer default 0,
  created_at timestamptz default now()
);
