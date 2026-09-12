const pool = require('../db/pool');

async function hasOpenSession(eventId, userId) {
  const result = await pool.query(
    `SELECT user_id FROM event_participant_sessions WHERE event_id = $1 AND user_id = $2 AND leave_time IS NULL;`,
    [eventId, userId]
  );
  return result.rowCount > 0;
}

async function openSession(eventId, userId, joinTime = new Date()) {
  const result = await pool.query(
    `INSERT INTO event_participant_sessions (event_id, user_id, join_time) VALUES ($1, $2, $3) RETURNING id;`,
    [eventId, userId, joinTime]
  );
  return result.rowCount > 0;
}

/** Abre sesión para todos los participantes ya registrados al momento de iniciar el evento */
async function openSessionsForAllParticipants(eventId, startTime) {
  const query = `
    INSERT INTO event_participant_sessions (event_id, user_id, join_time)
    SELECT $1, p.user_id, $2 FROM participants p WHERE p.event_id = $1;`;
  const result = await pool.query(query, [eventId, startTime]);
  return result.rowCount;
}

/** Cierra la sesión abierta (si existe) al salir del canal de voz */
async function closeOpenSession(eventId, userId) {
  const query = `
    UPDATE event_participant_sessions
    SET leave_time = NOW()
    WHERE event_id = $1 AND user_id = $2 AND leave_time IS NULL
    RETURNING user_id`;
  const result = await pool.query(query, [eventId, userId]);
  return result.rowCount > 0;
}

/** Encuentra la sesión (evento) activa a la que pertenece un canal de voz para un usuario dado */
async function findActiveEventForVoiceChannel(userId, voiceChannelId) {
  const query = `
    SELECT p.user_id, e.id, e.start_time, e.end_time
    FROM participants p
    INNER JOIN events e ON p.event_id = e.id
    WHERE user_id = $1 AND voice_channel_id = $2 AND e.status IN ('STARTED', 'ON GOING');`;
  const result = await pool.query(query, [userId, voiceChannelId]);
  return result.rows[0] ?? null;
}

/** Minutos totales que cada participante estuvo conectado, ya cerrado el evento */
async function getParticipationMinutes(eventId) {
  const query = `
    SELECT eps.user_id,
           SUM(
             EXTRACT(EPOCH FROM (COALESCE(eps.leave_time, e.end_time) - eps.join_time)) / 60
           ) AS minutes
    FROM event_participant_sessions eps
    JOIN events e ON e.id = eps.event_id
    WHERE eps.event_id = $1
    GROUP BY eps.user_id;`;
  const result = await pool.query(query, [eventId]);
  return result.rows;
}

module.exports = {
  hasOpenSession,
  openSession,
  openSessionsForAllParticipants,
  closeOpenSession,
  findActiveEventForVoiceChannel,
  getParticipationMinutes,
};
