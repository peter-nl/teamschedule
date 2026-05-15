-- Demo confirmation tokens table
CREATE TABLE IF NOT EXISTS demo_confirmation (
  token       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  lang        VARCHAR(10)  NOT NULL DEFAULT 'en',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS demo_confirmation_email_idx ON demo_confirmation(LOWER(email));
