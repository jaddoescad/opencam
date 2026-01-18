-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'Standard';

-- Update the handle_new_user function to include role from invitation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  invite_role text;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT role INTO invite_role
  FROM invitations
  WHERE email = new.email AND status = 'pending'
  LIMIT 1;

  -- Insert profile with role from invitation or default to 'Standard'
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(invite_role, 'Standard')
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
