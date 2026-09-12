-- Balances de economía por usuario de Discord
CREATE TABLE IF NOT EXISTS bank (
    user_id     TEXT PRIMARY KEY,
    balance     BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
