const eventsRepository = require('../../repositories/eventsRepository');
const participantsRepository = require('../../repositories/participantsRepository');
const eventService = require('../../services/eventService');
const { sendWarning, sendSuccess } = require('../../utils/channelMessages');
const { EMOJIS, TIMING } = require('../../config/constants');
const { buildEventEmbed } = require('./eventCreationReaction');

/**
 * Reacciones sobre el embed de un evento ya creado:
 *  🫡 unirse / ▶️ iniciar (solo creador) / ⏹️ cerrar (solo creador)
 */
async function handleEventControlReaction(reaction, user) {
  try {
    if (user.bot) return;
    if (![EMOJIS.JOIN, EMOJIS.START, EMOJIS.STOP].includes(reaction.emoji.name)) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.log('Error obteniendo reacción parcial:', error);
        return;
      }
    }
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (fetchError) {
        console.error(`Error al obtener mensaje parcial en el servidor ${reaction.message?.guild?.id || 'desconocido'}:`, fetchError);
        return;
      }
    }

    const event = await eventsRepository.findActiveEventByTextChannel(reaction.message.channel.id);
    if (!event) {
      console.log(`Canal ${reaction.message.channel.id} no está asociado a un evento activo`);
      return;
    }

    if (reaction.emoji.name === EMOJIS.JOIN) {
      await handleJoin(reaction, user, event);
    } else if (reaction.emoji.name === EMOJIS.START) {
      await handleStart(reaction, user, event);
    } else if (reaction.emoji.name === EMOJIS.STOP) {
      await handleStop(reaction, user, event);
    }
  } catch (error) {
    console.error(`Error al procesar la reacción de control en el servidor ${reaction.message?.guild?.id || 'desconocido'}:`, error);
  }
}

async function handleJoin(reaction, user, event) {
  try {
    const member = reaction.message.guild.members.cache.get(user.id) || (await reaction.message.guild.members.fetch(user.id));

    if (!member.voice.channel) {
      console.log(`${user.tag} intentó reaccionar pero no está en un canal de voz`);
      await sendWarning(reaction.message.channel, `${user}, debe estar en un canal de voz para unirse a un evento.`);
      await reaction.users.remove(user.id);
      return;
    }

    let result;
    try {
      result = await eventService.joinEvent(event.id, user.id, event.start_time);
    } catch (error) {
      console.log('No se pudo añadir al usuario como participante:', error);
      return;
    }

    if (result === 'already_joined') {
      await sendWarning(reaction.message.channel, `${user}, ya estas participando en el evento.`);
      await reaction.users.remove(user.id);
      return;
    }

    console.log(`${user.tag} añadido como participante al evento ${event.id}`);

    try {
      const participants = await participantsRepository.listParticipants(event.id);
      const participantsValue = participants.map((row) => `<@${row.user_id}>`).join(', ') || 'Ningún participante aún';

      const embed = buildEventEmbed({
        eventId: event.id,
        creatorId: event.creator_id,
        participantsValue,
        createdAtMs: reaction.message.createdTimestamp,
      });
      await reaction.message.edit({ embeds: [embed] });
      console.log(`Embed actualizado con participantes para el evento ${event.id}`);

      if (member.voice.channel) {
        member.voice
          .setChannel(event.voice_channel_id)
          .then(() => console.log('Usuario movido de manera exitosa a', event.voice_channel_id))
          .catch(console.error);
      }

      await sendSuccess(reaction.message.channel, `${user}, te has unido al evento.`);
      await reaction.users.remove(user.id);
    } catch (editError) {
      console.error(`Error al actualizar embed para el evento ${event.id}:`, editError);
      await sendWarning(reaction.message.channel, `${user.tag}, hubo un error actualizando la lista de participantes.`);
    }
  } catch (dbError) {
    console.error(`Error al gestionar participante para el evento ${event.id}:`, dbError);
    await sendWarning(reaction.message.channel, `${user.tag}, hubo un error al unirse al evento.`);
    await reaction.users.remove(user.id);
  }
}

async function handleStart(reaction, user, event) {
  if (user.id !== event.creator_id) {
    console.log(`${user.tag} intentó usar una acción reservada para el creador en el evento ${event.id}`);
    await sendWarning(reaction.message.channel, `${user}, solo el creador puede usar esta acción.`);
    await reaction.users.remove(user.id);
    return;
  }

  try {
    const started = await eventService.startEvent(event.id);
    if (!started) {
      console.log(`${user.tag} intentó iniciar el evento ${event.id}, pero no está en estado válido`);
      await sendWarning(reaction.message.channel, `${user}, el evento no puede iniciarse ahora.`);
      await reaction.users.remove(user.id);
      return;
    }

    console.log(`Evento ${event.id} iniciado por ${user.tag} con start_time`);
    await sendSuccess(reaction.message.channel, `${user}, el evento ha iniciado.`);
    await reaction.users.remove(user.id);
  } catch (dbError) {
    console.error(`Error al iniciar evento ${event.id}:`, dbError);
    await sendWarning(reaction.message.channel, `${user}, hubo un error al iniciar el evento.`);
    await reaction.users.remove(user.id);
  }
}

async function handleStop(reaction, user, event) {
  if (user.id !== event.creator_id) {
    console.log(`${user.tag} intentó usar una acción reservada para el creador en el evento ${event.id}`);
    await sendWarning(reaction.message.channel, `${user}, solo el creador puede usar esta acción.`);
    await reaction.users.remove(user.id);
    return;
  }

  try {
    const client = reaction.client;
    const voiceChannel = client.channels.cache.get(event.voice_channel_id);

    const results = await eventService.closeEventAndComputeResults(event.id);

    if (!results) {
      console.log(`${user.tag} intentó cerrar el evento ${event.id}, pero no está en estado válido`);
      await sendWarning(
        reaction.message.channel,
        `${user}, el evento no puede cerrarse si nisiquiera ha iniciado mono de mierda, darle a play y dejarlo correr al menos 10 segundos.`,
        TIMING.AUTO_DELETE_LONG_MS
      );
      await reaction.users.remove(user.id);
      return;
    }

    if (results.durationMinutes === null) {
      console.log(`No se pudo calcular la duración del evento ${event.id}: start_time no definido`);
      await sendWarning(reaction.message.channel, `${user.tag}, no se pudo calcular la duración del evento.`);
      await reaction.users.remove(user.id);
      return;
    }

    try {
      const participantData =
        results.participantSummary.map((p) => `<@${p.userId}>: ${p.percentage}%`).join('\n') || 'Ningún participante';

      const embed = {
        title: `Evento-${event.id}`,
        description: 'Evento finalizado',
        color: 0xff0000,
        fields: [
          { name: 'Creado por', value: `<@${event.creator_id}>`, inline: true },
          { name: 'Hora de creación (UTC)', value: `<t:${Math.floor(reaction.message.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Duración total', value: `${results.durationMinutes.toFixed(0)} minutos`, inline: false },
          { name: 'Participantes', value: participantData, inline: false },
        ],
        timestamp: new Date(),
      };

      await reaction.message.edit({ embeds: [embed] });
      console.log(`Embed actualizado con resultados para el evento ${event.id}`);

      await sendSuccess(reaction.message.channel, `${user.tag}, el evento ha sido cerrado. Duración: ${results.durationMinutes.toFixed(0)} minutos.`);
      await reaction.users.remove(user.id);

      if (voiceChannel) {
        try {
          await voiceChannel.delete('Evento finalizado, se elimina el canal de voz');
          console.log(`Canal de voz ${voiceChannel.name} eliminado correctamente`);
        } catch (error) {
          console.error('Error al eliminar el canal:', error);
        }
      } else {
        console.error('No se encontró el canal de voz del evento');
      }
    } catch (editError) {
      console.error(`Error al actualizar embed para el evento ${event.id}:`, editError);
      await sendWarning(reaction.message.channel, `${user.tag}, hubo un error actualizando los resultados del evento.`);
      await reaction.users.remove(user.id);
    }
  } catch (dbError) {
    console.error(`Error al cerrar evento ${event.id}:`, dbError);
    await sendWarning(reaction.message.channel, `${user.tag}, hubo un error al cerrar el evento.`);
    await reaction.users.remove(user.id);
  }
}

module.exports = { handleEventControlReaction };
