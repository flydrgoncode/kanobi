BEGIN;

CREATE TABLE IF NOT EXISTS tenant_scoped_role_permissions (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES tenant_role_definitions(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permission_definitions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_scoped_role_permissions_tenant_role_permission_uidx
  ON tenant_scoped_role_permissions (tenant_id, role_id, permission_id);

CREATE INDEX IF NOT EXISTS tenant_scoped_role_permissions_tenant_role_idx
  ON tenant_scoped_role_permissions (tenant_id, role_id);

CREATE INDEX IF NOT EXISTS tenant_scoped_role_permissions_permission_idx
  ON tenant_scoped_role_permissions (permission_id);

DELETE FROM tenant_scoped_role_permissions;

INSERT INTO tenant_scoped_role_permissions (tenant_id, role_id, permission_id)
SELECT t.id, tr.id, pd.id
FROM tenants t
JOIN tenant_role_definitions tr ON tr.code = 'member'
JOIN permission_definitions pd ON pd.code = 'workspace_use'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_scoped_role_permissions (tenant_id, role_id, permission_id)
SELECT t.id, tr.id, pd.id
FROM tenants t
JOIN tenant_role_definitions tr ON tr.code = 'support'
JOIN permission_definitions pd ON pd.code IN ('workspace_use', 'workspace_backoffice')
ON CONFLICT DO NOTHING;

INSERT INTO tenant_scoped_role_permissions (tenant_id, role_id, permission_id)
SELECT t.id, tr.id, pd.id
FROM tenants t
JOIN tenant_role_definitions tr ON tr.code = 'superuser'
JOIN permission_definitions pd ON pd.code IN (
  'workspace_use',
  'workspace_backoffice',
  'workspace_config'
)
ON CONFLICT DO NOTHING;

COMMIT;
