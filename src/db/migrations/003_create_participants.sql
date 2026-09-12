-- Participantes de cada evento y el % del monto que les corresponde
CREATE TABLE IF NOT EXISTS participants (
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    percentage  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    PRIMARY KEY (event_id, user_id)
);
