-- Create storage bucket for photos (via Supabase dashboard or SQL)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);

-- Storage policy
create policy "Authenticated users can upload photos"
on storage.objects for insert
with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Anyone can view photos"
on storage.objects for select
using (bucket_id = 'photos');

-- Trigger to auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Trigger to update project updated_at
create or replace function update_project_timestamp()
returns trigger as $$
begin
  update projects set updated_at = now() where id = new.project_id;
  return new;
end;
$$ language plpgsql;

create trigger on_photo_added
  after insert on photos
  for each row execute function update_project_timestamp();
