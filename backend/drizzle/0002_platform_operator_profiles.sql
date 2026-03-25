CREATE TABLE platform_operator_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  contact_name varchar(160) NOT NULL,
  contact_email varchar(320) NOT NULL,
  contact_phone varchar(40),
  updated_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
