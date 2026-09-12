const sessionsRepository = require('../repositories/sessionsRepository');
const participantsRepository = require('../repositories/participantsRepository');

/**
 * Cuando alguien sale de un canal de voz que pertenece a un evento
 * ON GOING/STARTED, cierra su sesión abierta (o, si el evento aún no
 * había iniciado, simplemente lo quita de participants).
 */
async function handleVoiceStateUpdate(oldState, newState) {
  try {
    const user = newState.member?.user || oldState.member?.user;
    if (!user || user.bot) return;

    const newChannelId = newState.channelId;
    const oldChannelId = oldState.channelId;

    if (!(oldChannelId && newChannelId !== oldChannelId)) return;

    const active = await sessionsRepository.findActiveEventForVoiceChannel(user.id, oldChannelId);
    if (!active) {
      console.log('El usuario no estaba participando del evento, el canal no es un canal de evento, o el evento terminó');
      return;
    }

    const eventId = active.id;

    try {
      if (!active.start_time) {
        await participantsRepository.removeParticipant(eventId, user.id);
        console.log('El evento aun no ha iniciado por lo tanto no vamos a actualizar un leave_time todavia');
        return;
      }

      const closed = await sessionsRepository.closeOpenSession(eventId, user.id);
      if (!closed) {
        console.log('No se actualizó ninguna sesión abierta');
      }
      console.log(`${user.tag} salió del canal de voz del evento ${eventId}`);
    } catch (dbError) {
      console.error(`Error al registrar salida de ${user.tag} en el evento ${eventId}:`, dbError);
    }
  } catch (error) {
    console.error(`Error al procesar voiceStateUpdate en el servidor ${oldState.guild?.id || newState.guild?.id || 'desconocido'}:`, error);
  }
}

module.exports = { handleVoiceStateUpdate };
