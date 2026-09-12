-- El mensaje con reacción 🎉 que cada servidor usa para "crear evento"
CREATE TABLE IF NOT EXISTS eventmessage (
    guild_id    TEXT PRIMARY KEY,
    message_id  TEXT NOT NULL
);
