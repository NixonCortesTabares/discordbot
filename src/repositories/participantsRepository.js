const pool = require('../db/pool');

/** Inserta un participante si no existía ya. Devuelve true si se insertó, false si ya estaba. */
async function addParticipant(eventId, userId) {
  const query = `
    INSERT INTO participants (event_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (event_id, user_id) DO NOTHING
    RETURNING user_id;`;
  const result = await pool.query(query, [eventId, userId]);
  return result.rowCount > 0;
}

async function removeParticipant(eventId, userId) {
  await pool.query(`DELETE FROM participants WHERE user_id = $1 AND event_id = $2`, [userId, eventId]);
}

async function getParticipant(eventId, userId) {
  const result = await pool.query(
    `SELECT * FROM participants WHERE user_id = $1 AND event_id = $2`,
    [userId, eventId]
  );
  return result.rows[0] ?? null;
}

async function listParticipants(eventId) {
  const result = await pool.query(`SELECT user_id FROM participants WHERE event_id = $1`, [eventId]);
  return result.rows;
}

async function listParticipantsWithPercentage(eventId) {
  const result = await pool.query(
    `SELECT user_id, percentage FROM participants WHERE event_id = $1`,
    [eventId]
  );
  return result.rows;
}

async function updatePercentage(eventId, userId, percentage) {
  await pool.query(
    `UPDATE participants SET percentage = $1 WHERE event_id = $2 AND user_id = $3;`,
    [percentage, eventId, userId]
  );
}

async function insertWithPercentage(eventId, userId, percentage) {
  await pool.query(
    `INSERT INTO participants (event_id, user_id, percentage) VALUES ($1, $2, $3)`,
    [eventId, userId, percentage]
  );
}

async function getTotalPercentage(eventId) {
  const result = await pool.query(
    `SELECT SUM(percentage) AS total_porcentajes FROM participants WHERE event_id = $1;`,
    [eventId]
  );
  return result.rows[0]?.total_porcentajes ?? null;
}

module.exports = {
  addParticipant,
  removeParticipant,
  getParticipant,
  listParticipants,
  listParticipantsWithPercentage,
  updatePercentage,
  insertWithPercentage,
  getTotalPercentage,
};
