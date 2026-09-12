-- Registra cada entrada/salida de un participante al canal de voz del
-- evento mientras este está STARTED, para calcular su % de participación.
CREATE TABLE IF NOT EXISTS event_participant_sessions (
    id          SERIAL PRIMARY KEY,
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    join_time   TIMESTAMPTZ NOT NULL,
    leave_time  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_eps_event_user ON event_participant_sessions (event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_eps_open_sessions ON event_participant_sessions (event_id, user_id) WHERE leave_time IS NULL;
