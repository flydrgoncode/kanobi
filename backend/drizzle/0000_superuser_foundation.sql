CREATE TYPE platform_role AS ENUM ('user', 'god');
CREATE TYPE account_status AS ENUM ('active', 'disabled', 'invited');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE membership_role AS ENUM ('member', 'support', 'superuser');
CREATE TYPE membership_status AS ENUM ('active', 'disabled', 'removed');
CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'llama');
CREATE TYPE email_provider AS ENUM ('smtp', 'ses', 'resend', 'custom');

CREATE TABLE auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  email_normalized varchar(320) NOT NULL,
  first_name varchar(120) NOT NULL,
  last_name varchar(120) NOT NULL,
  job_title varchar(160),
  phone varchar(40),
  avatar_url text,
  password_hash text NOT NULL,
  platform_role platform_role NOT NULL DEFAULT 'user',
  account_status account_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_users_email_normalized_uidx
  ON auth_users (email_normalized);

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  slug varchar(200) NOT NULL,
  tax_id varchar(32) NOT NULL,
  status tenant_status NOT NULL DEFAULT 'active',
  primary_superuser_membership_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenants_slug_uidx ON tenants (slug);
CREATE UNIQUE INDEX tenants_tax_id_uidx ON tenants (tax_id);

CREATE TABLE tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  is_primary_superuser boolean NOT NULL DEFAULT false,
  invited_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_memberships_tenant_user_uidx
  ON tenant_memberships (tenant_id, user_id);

CREATE UNIQUE INDEX tenant_memberships_primary_superuser_uidx
  ON tenant_memberships (tenant_id)
  WHERE is_primary_superuser = true;

CREATE TABLE tenant_join_request_statuses (
  code join_request_status PRIMARY KEY,
  label varchar(80) NOT NULL,
  description text,
  sort_order integer NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO tenant_join_request_statuses (code, label, description, sort_order, is_terminal)
VALUES
  ('pending', 'Pending', 'Request is waiting for superuser approval.', 10, false),
  ('approved', 'Approved', 'Request was approved and membership can be created.', 20, true),
  ('rejected', 'Rejected', 'Request was rejected by the workspace superuser.', 30, true);

CREATE TABLE tenant_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  requested_role membership_role NOT NULL DEFAULT 'member',
  request_message text,
  status join_request_status NOT NULL DEFAULT 'pending',
  decided_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_company_setup (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  legal_name varchar(200) NOT NULL,
  display_name varchar(160) NOT NULL,
  tax_id varchar(32) NOT NULL,
  website_url varchar(255),
  country_code varchar(2),
  primary_contact_name varchar(160),
  primary_contact_email varchar(320),
  billing_email varchar(320),
  company_summary text,
  setup_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_llm_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  api_key_ciphertext text NOT NULL,
  default_model varchar(120),
  is_enabled boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workspace_llm_configs_tenant_provider_uidx
  ON workspace_llm_configs (tenant_id, provider);

CREATE TABLE workspace_email_configs (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  provider email_provider NOT NULL,
  from_name varchar(160) NOT NULL,
  from_email varchar(320) NOT NULL,
  reply_to_email varchar(320),
  smtp_host varchar(200),
  smtp_port integer,
  smtp_username varchar(200),
  smtp_password_ciphertext text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  entity_type varchar(80) NOT NULL,
  entity_id varchar(120) NOT NULL,
  action varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants
  ADD CONSTRAINT tenants_primary_superuser_membership_fk
  FOREIGN KEY (primary_superuser_membership_id)
  REFERENCES tenant_memberships(id)
  ON DELETE SET NULL;
