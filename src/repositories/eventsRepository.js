const pool = require('../db/pool');
const { EVENT_STATUS } = require('../config/constants');

async function findActiveEventByCreator(creatorId) {
  const result = await pool.query(
    `SELECT id FROM events WHERE creator_id = $1 AND status = $2`,
    [creatorId, EVENT_STATUS.ON_GOING]
  );
  return result.rows[0] ?? null;
}

async function createEvent({ guildId, creatorId, voiceChannelId, textChannelId }) {
  const query = `
    INSERT INTO events (guild_id, creator_id, voice_channel_id, text_channel_id, status, seller_id, amount)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`;
  const result = await pool.query(query, [
    guildId,
    creatorId,
    voiceChannelId,
    textChannelId,
    EVENT_STATUS.ON_GOING,
    null,
    0,
  ]);
  return result.rows[0] ?? null;
}

async function deleteEvent(eventId) {
  await pool.query(`DELETE FROM events WHERE id = $1`, [eventId]);
}

async function setEmbedId(eventId, embedId) {
  const result = await pool.query(`UPDATE events SET embed_id = $1 WHERE id = $2`, [embedId, eventId]);
  return result.rowCount > 0;
}

/** El evento activo (ON GOING o STARTED) vinculado al canal de texto donde se reacciona */
async function findActiveEventByTextChannel(textChannelId) {
  const result = await pool.query(
    `SELECT id, creator_id, text_channel_id, voice_channel_id, start_time
     FROM events WHERE text_channel_id = $1 AND status IN ('ON GOING', 'STARTED')`,
    [textChannelId]
  );
  return result.rows[0] ?? null;
}

/** Evento (en cualquier estado activo) vinculado a un canal — usado por /setcreadorevento */
async function updateCreatorByTextChannel(textChannelId, newCreatorId) {
  const query = `
    UPDATE events SET creator_id = $1
    WHERE text_channel_id = $2 AND status IN ('STARTED', 'ON GOING')
    RETURNING embed_id;`;
  const result = await pool.query(query, [newCreatorId, textChannelId]);
  return result.rows[0] ?? null;
}

async function startEvent(eventId) {
  const query = `
    UPDATE events SET status = $1, start_time = NOW()
    WHERE id = $2 AND status IN ('ON GOING') AND start_time IS NULL
    RETURNING start_time;`;
  const result = await pool.query(query, [EVENT_STATUS.STARTED, eventId]);
  return result.rows[0] ?? null;
}

async function closeEvent(eventId) {
  const query = `
    UPDATE events SET status = $1, end_time = NOW()
    WHERE id = $2 AND status IN ('STARTED') AND start_time IS NOT NULL`;
  const result = await pool.query(query, [EVENT_STATUS.CLOSED, eventId]);
  return result.rowCount > 0;
}

async function getDurationMinutes(eventId) {
  const query = `
    SELECT EXTRACT(EPOCH FROM (end_time - start_time)) / 60 AS minutes
    FROM events WHERE id = $1 AND start_time IS NOT NULL`;
  const result = await pool.query(query, [eventId]);
  return result.rows[0]?.minutes ? parseFloat(result.rows[0].minutes) : null;
}

/** Evento CLOSED con amount aún en 0, buscado por canal — usado por /setvendedor */
async function assignSellerToClosedEvent(textChannelId, sellerId) {
  const query = `
    UPDATE events SET seller_id = $1
    WHERE text_channel_id = $2 AND status = 'CLOSED' AND amount = 0
    RETURNING id;`;
  const result = await pool.query(query, [sellerId, textChannelId]);
  return result.rows[0] ?? null;
}

/** Evento donde el usuario dado es el vendedor asignado — usado por /simular */
async function findEventBySeller(textChannelId, sellerId) {
  const result = await pool.query(
    `SELECT id, seller_id FROM events WHERE text_channel_id = $1 AND seller_id = $2;`,
    [textChannelId, sellerId]
  );
  return result.rows[0] ?? null;
}

async function setAmount(eventId, amount) {
  const result = await pool.query(
    `UPDATE events SET amount = $1 WHERE id = $2 RETURNING embed_id;`,
    [amount, eventId]
  );
  return result.rows[0] ?? null;
}

/** Evento (cualquier estado) vinculado a un canal — usado por /confirmar y /setpercentage */
async function findByTextChannel(textChannelId, status = null) {
  const query = status
    ? `SELECT id, amount FROM events WHERE text_channel_id = $1 AND status = $2`
    : `SELECT id, amount FROM events WHERE text_channel_id = $1`;
  const params = status ? [textChannelId, status] : [textChannelId];
  const result = await pool.query(query, params);
  return result.rows[0] ?? null;
}

module.exports = {
  findActiveEventByCreator,
  createEvent,
  deleteEvent,
  setEmbedId,
  findActiveEventByTextChannel,
  updateCreatorByTextChannel,
  startEvent,
  closeEvent,
  getDurationMinutes,
  assignSellerToClosedEvent,
  findEventBySeller,
  setAmount,
  findByTextChannel,
};
