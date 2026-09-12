-- Un "evento" = sesión de voz creada por reacción, con su propio canal
-- de texto y voz, un creador, un vendedor opcional y un monto a repartir.
CREATE TABLE IF NOT EXISTS events (
    id                SERIAL PRIMARY KEY,
    guild_id          TEXT NOT NULL,
    creator_id        TEXT NOT NULL,
    voice_channel_id  TEXT NOT NULL,
    text_channel_id   TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'ON GOING'
                        CHECK (status IN ('ON GOING', 'STARTED', 'PAUSED', 'CLOSED')),
    seller_id         TEXT,
    amount            BIGINT NOT NULL DEFAULT 0,
    embed_id          TEXT,
    start_time        TIMESTAMPTZ,
    end_time          TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_text_channel ON events (text_channel_id);
CREATE INDEX IF NOT EXISTS idx_events_creator_status ON events (creator_id, status);
