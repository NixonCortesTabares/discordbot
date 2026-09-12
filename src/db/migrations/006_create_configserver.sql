-- Canal de texto donde cada servidor publica el mensaje de "crear evento"
CREATE TABLE IF NOT EXISTS configserver (
    guild_id    TEXT PRIMARY KEY,
    channel_id  TEXT NOT NULL
);
