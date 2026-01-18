-- Create invitations table
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text DEFAULT 'Standard',
  invited_by uuid REFERENCES profiles(id),
  token uuid DEFAULT gen_random_uuid(),
  status text DEFAULT 'pending', -- pending, accepted, expired
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  UNIQUE(email, status)
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view invitations" ON invitations FOR SELECT USING (
  invited_by = auth.uid()
);

CREATE POLICY "Admins can create invitations" ON invitations FOR INSERT WITH CHECK (
  invited_by = auth.uid()
);

CREATE POLICY "Anyone can view invitation by token" ON invitations FOR SELECT USING (
  status = 'pending'
);

CREATE POLICY "Invitations can be updated" ON invitations FOR UPDATE USING (
  status = 'pending'
);
