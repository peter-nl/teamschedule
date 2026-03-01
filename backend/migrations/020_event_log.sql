-- Migration 020: Event log
-- Records key security and business events for audit purposes.

CREATE TABLE IF NOT EXISTS event_log (
  id          BIGSERIAL    PRIMARY KEY,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  event_type  VARCHAR(50)  NOT NULL,
  actor_id    VARCHAR(100),
  ip_address  VARCHAR(45),
  details     JSONB
);

CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_event_type ON event_log (event_type);
