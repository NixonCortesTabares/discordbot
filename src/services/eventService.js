const eventsRepository = require('../repositories/eventsRepository');
const participantsRepository = require('../repositories/participantsRepository');
const sessionsRepository = require('../repositories/sessionsRepository');
const bankRepository = require('../repositories/bankRepository');

/** ¿El usuario ya tiene un evento ON GOING? Regla de negocio: solo uno a la vez. */
async function userHasActiveEvent(userId) {
  return Boolean(await eventsRepository.findActiveEventByCreator(userId));
}

/**
 * Registra a un usuario como participante del evento.
 * Si el evento ya inició (start_time definido), además abre una sesión de
 * voz — a menos que ya tenga una abierta (reingreso).
 * Devuelve un código de resultado para que el handler decida qué mensaje mostrar.
 */
async function joinEvent(eventId, userId, eventStartTime) {
  await bankRepository.ensureAccount(userId);

  if (!eventStartTime) {
    // El evento aún no ha iniciado: unirse es solo registrarse en participants.
    const inserted = await participantsRepository.addParticipant(eventId, userId);
    return inserted ? 'joined' : 'already_joined';
  }

  // El evento ya está en curso: registrarse (si no lo estaba) y abrir una
  // sesión de voz nueva, salvo que ya tenga una abierta (reingreso rápido).
  await participantsRepository.addParticipant(eventId, userId);

  const alreadyOpen = await sessionsRepository.hasOpenSession(eventId, userId);
  if (alreadyOpen) {
    return 'already_joined';
  }

  await sessionsRepository.openSession(eventId, userId, new Date());
  return 'joined';
}

/** Inicia el evento: cambia estado y abre sesión de voz para todos los ya inscritos */
async function startEvent(eventId) {
  const started = await eventsRepository.startEvent(eventId);
  if (!started) return null;

  await sessionsRepository.openSessionsForAllParticipants(eventId, started.start_time);
  return started;
}

/**
 * Cierra el evento, calcula duración total y el % de tiempo conectado de
 * cada participante (actualizando la tabla participants), y devuelve todo
 * listo para pintar el embed final.
 */
async function closeEventAndComputeResults(eventId) {
  const closed = await eventsRepository.closeEvent(eventId);
  if (!closed) return null;

  const durationMinutes = await eventsRepository.getDurationMinutes(eventId);
  if (!durationMinutes) return { durationMinutes: null };

  const participationRows = await sessionsRepository.getParticipationMinutes(eventId);

  for (const row of participationRows) {
    const percentage =
      durationMinutes > 0 ? parseFloat(((row.minutes / durationMinutes) * 100).toFixed(0)) : 100;
    await participantsRepository.updatePercentage(eventId, row.user_id, percentage);
  }

  const allParticipants = await participantsRepository.listParticipants(eventId);
  const participantSummary = allParticipants.map((row) => {
    const timeRow = participationRows.find((t) => t.user_id === row.user_id);
    const minutes = timeRow ? parseFloat(timeRow.minutes) : 0;
    const percentage = durationMinutes > 0 ? ((minutes / durationMinutes) * 100).toFixed(0) : '100';
    return { userId: row.user_id, percentage };
  });

  return { durationMinutes, participantSummary };
}

module.exports = {
  userHasActiveEvent,
  joinEvent,
  startEvent,
  closeEventAndComputeResults,
};
