BEGIN;

DELETE FROM tenant_membership_permission_overrides;
DELETE FROM platform_role_permissions;
DELETE FROM tenant_role_permissions;
DELETE FROM permission_definitions;

UPDATE platform_role_definitions
SET
  name = CASE code
    WHEN 'god' THEN 'God'
    WHEN 'user' THEN 'User'
    ELSE name
  END,
  description = CASE code
    WHEN 'god' THEN 'Global Mission Control operator with full platform visibility and workspace impersonation.'
    WHEN 'user' THEN 'Authenticated platform user without Mission Control privileges.'
    ELSE description
  END,
  updated_at = NOW()
WHERE code IN ('god', 'user');

UPDATE tenant_role_definitions
SET
  name = CASE code
    WHEN 'member' THEN 'Member'
    WHEN 'support' THEN 'Support'
    WHEN 'superuser' THEN 'Superuser'
    ELSE name
  END,
  description = CASE code
    WHEN 'member' THEN 'Normal workspace user with standard usage and exploration access.'
    WHEN 'support' THEN 'Workspace backoffice operator with usage and operational access.'
    WHEN 'superuser' THEN 'Workspace administrator with usage, backoffice and configuration access.'
    ELSE description
  END,
  updated_at = NOW()
WHERE code IN ('member', 'support', 'superuser');

INSERT INTO permission_definitions (
  code,
  name,
  description,
  scope,
  menu_key,
  is_system,
  is_active
)
VALUES
  (
    'mission_control',
    'Mission Control',
    'Access all Mission Control menus as the God user.',
    'platform',
    'mission_control',
    true,
    true
  ),
  (
    'workspace_use',
    'Workspace Use',
    'Access the normal day-to-day workspace menus for exploration and usage.',
    'tenant',
    'workspace.use',
    true,
    true
  ),
  (
    'workspace_backoffice',
    'Workspace Backoffice',
    'Access the support and operational backoffice menus in a workspace.',
    'tenant',
    'workspace.backoffice',
    true,
    true
  ),
  (
    'workspace_config',
    'Workspace Config',
    'Access superuser configuration and administrative menus in a workspace.',
    'tenant',
    'workspace.config',
    true,
    true
  );

INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT pr.id, pd.id
FROM platform_role_definitions pr
JOIN permission_definitions pd ON pd.code = 'mission_control'
WHERE pr.code = 'god'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_role_permissions (role_id, permission_id)
SELECT tr.id, pd.id
FROM tenant_role_definitions tr
JOIN permission_definitions pd ON pd.code = 'workspace_use'
WHERE tr.code = 'member'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_role_permissions (role_id, permission_id)
SELECT tr.id, pd.id
FROM tenant_role_definitions tr
JOIN permission_definitions pd ON pd.code IN ('workspace_use', 'workspace_backoffice')
WHERE tr.code = 'support'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_role_permissions (role_id, permission_id)
SELECT tr.id, pd.id
FROM tenant_role_definitions tr
JOIN permission_definitions pd ON pd.code IN (
  'workspace_use',
  'workspace_backoffice',
  'workspace_config'
)
WHERE tr.code = 'superuser'
ON CONFLICT DO NOTHING;

COMMIT;
