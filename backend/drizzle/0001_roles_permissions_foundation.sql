CREATE TYPE permission_scope AS ENUM ('platform', 'tenant');
CREATE TYPE permission_effect AS ENUM ('allow', 'deny');
CREATE TYPE access_entry_mode AS ENUM ('normal', 'god_override');
CREATE TYPE access_entry_source AS ENUM ('direct', 'companies_list', 'mission_control');

CREATE TABLE platform_role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX platform_role_definitions_code_uidx
  ON platform_role_definitions (code);

CREATE TABLE tenant_role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_role_definitions_code_uidx
  ON tenant_role_definitions (code);

CREATE TABLE permission_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(120) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  scope permission_scope NOT NULL,
  menu_key varchar(160),
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX permission_definitions_code_uidx
  ON permission_definitions (code);

CREATE TABLE platform_role_permissions (
  role_id uuid NOT NULL REFERENCES platform_role_definitions(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permission_definitions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX platform_role_permissions_role_permission_uidx
  ON platform_role_permissions (role_id, permission_id);

CREATE TABLE tenant_role_permissions (
  role_id uuid NOT NULL REFERENCES tenant_role_definitions(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permission_definitions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_role_permissions_role_permission_uidx
  ON tenant_role_permissions (role_id, permission_id);

CREATE TABLE tenant_membership_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_membership_id uuid NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permission_definitions(id) ON DELETE CASCADE,
  effect permission_effect NOT NULL,
  created_by_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_membership_permission_overrides_membership_permission_uidx
  ON tenant_membership_permission_overrides (tenant_membership_id, permission_id);

CREATE TABLE workspace_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  entry_mode access_entry_mode NOT NULL,
  source access_entry_source NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workspace_access_log_tenant_created_idx
  ON workspace_access_log (tenant_id, created_at);

CREATE INDEX workspace_access_log_actor_created_idx
  ON workspace_access_log (actor_user_id, created_at);

INSERT INTO platform_role_definitions (code, name, description)
VALUES
  ('user', 'User', 'Default authenticated platform user.'),
  ('god', 'God', 'Mission Control operator with workspace override access.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tenant_role_definitions (code, name, description)
VALUES
  ('member', 'Member', 'Workspace member with exploration access.'),
  ('support', 'Support', 'Workspace operator with support menu access.'),
  ('superuser', 'Superuser', 'Workspace administrator with full tenant controls.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, scope, menu_key)
VALUES
  ('workspace.view', 'Workspace View', 'Access the workspace exploration areas.', 'tenant', 'workspace.home'),
  ('workspace.users.manage', 'Manage Users', 'Manage tenant users from the superuser menu.', 'tenant', 'workspace.users'),
  ('workspace.invites.review', 'Review Invites', 'Approve and reject tenant join requests.', 'tenant', 'workspace.invites'),
  ('workspace.companies.manage', 'Manage Companies', 'Edit company setup and enter workspaces.', 'tenant', 'workspace.companies'),
  ('workspace.integrations.manage', 'Manage Integrations', 'Manage tenant LLM and email integrations.', 'tenant', 'workspace.integrations'),
  ('workspace.danger_zone.manage', 'Manage Danger Zone', 'Execute destructive tenant actions.', 'tenant', 'workspace.danger_zone'),
  ('mission_control.view', 'Mission Control View', 'Access the global mission control area.', 'platform', 'mission_control.overview'),
  ('mission_control.workspace_enter', 'Mission Control Workspace Enter', 'Enter any tenant workspace with elevated access.', 'platform', 'mission_control.workspace_enter')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tenant_role_permissions (role_id, permission_id)
SELECT tr.id, pd.id
FROM tenant_role_definitions tr
JOIN permission_definitions pd ON pd.code IN ('workspace.view')
WHERE tr.code = 'member'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_role_permissions (role_id, permission_id)
SELECT tr.id, pd.id
FROM tenant_role_definitions tr
JOIN permission_definitions pd ON pd.code IN ('workspace.view')
WHERE tr.code = 'support'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_role_permissions (role_id, permission_id)
SELECT tr.id, pd.id
FROM tenant_role_definitions tr
JOIN permission_definitions pd ON pd.code IN (
  'workspace.view',
  'workspace.users.manage',
  'workspace.invites.review',
  'workspace.companies.manage',
  'workspace.integrations.manage',
  'workspace.danger_zone.manage'
)
WHERE tr.code = 'superuser'
ON CONFLICT DO NOTHING;

INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT pr.id, pd.id
FROM platform_role_definitions pr
JOIN permission_definitions pd ON pd.code IN ('mission_control.view')
WHERE pr.code = 'user'
ON CONFLICT DO NOTHING;

INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT pr.id, pd.id
FROM platform_role_definitions pr
JOIN permission_definitions pd ON pd.code IN (
  'mission_control.view',
  'mission_control.workspace_enter'
)
WHERE pr.code = 'god'
ON CONFLICT DO NOTHING;
