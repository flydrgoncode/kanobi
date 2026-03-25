BEGIN;

CREATE TYPE auth_session_scope AS ENUM ('god', 'tenant');

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL,
  scope auth_session_scope NOT NULL DEFAULT 'god',
  active_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_sessions_token_hash_uidx
  ON auth_sessions (session_token_hash);

CREATE INDEX auth_sessions_user_idx
  ON auth_sessions (user_id, expires_at);

CREATE INDEX auth_sessions_active_tenant_idx
  ON auth_sessions (active_tenant_id, expires_at);

COMMIT;
