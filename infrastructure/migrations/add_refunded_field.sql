-- Migration: Add refunded field to generations table
-- Date: 2026-04-26

ALTER TABLE generations ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_generations_refunded ON generations(refunded);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_user_status ON generations(user_id, status);

-- Comment on the new column
COMMENT ON COLUMN generations.refunded IS 'Whether credits have been refunded for this generation';
