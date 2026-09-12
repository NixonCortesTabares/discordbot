const pool = require('../db/pool');

async function setEventChannel(guildId, channelId) {
  const query = `
    INSERT INTO configserver (guild_id, channel_id)
    VALUES ($1, $2)
    ON CONFLICT (guild_id) DO UPDATE SET channel_id = EXCLUDED.channel_id
    RETURNING channel_id;`;
  const result = await pool.query(query, [guildId, channelId]);
  return result.rows[0] ?? null;
}

async function setEventMessage(guildId, messageId) {
  const query = `
    INSERT INTO eventmessage (guild_id, message_id)
    VALUES ($1, $2)
    ON CONFLICT (guild_id) DO UPDATE SET message_id = EXCLUDED.message_id
    RETURNING message_id;`;
  const result = await pool.query(query, [guildId, messageId]);
  return result.rows[0] ?? null;
}

/** El message_id registrado como "mensaje de crear evento" del servidor */
async function getEventMessageId(guildId) {
  const result = await pool.query(`SELECT message_id FROM eventmessage WHERE guild_id = $1`, [guildId]);
  return result.rows[0]?.message_id ?? null;
}

module.exports = { setEventChannel, setEventMessage, getEventMessageId };
