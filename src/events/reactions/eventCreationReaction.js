const { ChannelType, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const eventsRepository = require('../../repositories/eventsRepository');
const serverConfigRepository = require('../../repositories/serverConfigRepository');
const { sendWarning, sendSuccess } = require('../../utils/channelMessages');
const { ROLES, CATEGORIES, EMOJIS } = require('../../config/constants');

/**
 * Reacción 🎉 en el mensaje de "crear evento" de un servidor:
 * crea el canal de texto + voz del evento, guarda el evento en BD,
 * pinta el embed inicial y mueve al creador al canal de voz.
 */
async function handleEventCreationReaction(reaction, user, client) {
  try {
    if (user.bot) return;
    if (reaction.emoji.name !== EMOJIS.CREATE_EVENT) return;

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

    // Verificar que la reacción sea sobre el mensaje registrado de "crear evento"
    const registeredMessageId = await serverConfigRepository.getEventMessageId(reaction.message.guild.id);
    if (!registeredMessageId || registeredMessageId !== reaction.message.id) {
      return;
    }

    const member = reaction.message.guild.members.cache.get(user.id) || (await reaction.message.guild.members.fetch(user.id));

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      console.log(`${user.tag} intento reaccionar pero no tiene permisos de administrador`);
      await sendWarning(reaction.message.channel, `${user.tag}, only authorized people can start events.`);
      await reaction.users.remove(user.id);
      return;
    }

    if (!member.voice.channel) {
      console.log(`${user.tag} intentó reaccionar pero no está en un canal de voz`);
      await sendWarning(reaction.message.channel, `${user}, you must be in a channel to start an event.`);
      await reaction.users.remove(user.id);
      return;
    }

    const existingEvent = await eventsRepository.findActiveEventByCreator(user.id);
    if (existingEvent) {
      console.log(`${user.tag} intentó crear un evento pero ya tiene uno activo con ID ${existingEvent.id}`);
      await sendWarning(reaction.message.channel, `${user.tag}, you have one event already started, can not create another one.`);
      await reaction.users.remove(user.id);
      return;
    }

    const categoria = reaction.message.guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORIES.EVENTOS
    );
    const roleMiembros = reaction.message.guild.roles.cache.find((r) => r.name === ROLES.MIEMBROS);
    const roleAmigos = reaction.message.guild.roles.cache.find((r) => r.name === ROLES.AMIGOS);

    let canalTexto;
    let canalVoz;
    try {
      canalTexto = await reaction.message.guild.channels.create({
        name: 'provisional',
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: buildTextChannelOverwrites(reaction.message.guild, roleMiembros, roleAmigos),
      });

      canalVoz = await reaction.message.guild.channels.create({
        name: 'provisionalvoice',
        type: ChannelType.GuildVoice,
        parent: categoria.id,
        permissionOverwrites: buildVoiceChannelOverwrites(roleMiembros, roleAmigos),
      });
    } catch (channelError) {
      console.error(`Error al crear canales en el servidor ${reaction.message.guild.id}:`, channelError);
      await sendWarning(reaction.message.channel, `${user.tag}, hubo un error creando los canales.`);
      if (canalTexto) await canalTexto.delete().catch(console.error);
      await reaction.users.remove(user.id);
      return;
    }

    let createdEvent;
    try {
      createdEvent = await eventsRepository.createEvent({
        guildId: reaction.message.guild.id,
        creatorId: user.id,
        voiceChannelId: canalVoz.id,
        textChannelId: canalTexto.id,
      });
    } catch (dbError) {
      console.error(`Error al guardar evento en la base de datos en el servidor ${reaction.message.guild.id}:`, dbError);
      await sendWarning(reaction.message.channel, `${user.tag}, hubo un error guardando el evento en la base de datos.`);
      await canalTexto.delete().catch(console.error);
      await canalVoz.delete().catch(console.error);
      await reaction.users.remove(user.id);
      return;
    }

    if (!createdEvent) {
      console.log('No se pudo guardar el evento en la db');
      await sendWarning(reaction.message.channel, `${user.tag}, hubo un error guardando el evento en la base de datos.`);
      await canalTexto.delete().catch(console.error);
      await canalVoz.delete().catch(console.error);
      await reaction.users.remove(user.id);
      return;
    }

    const eventId = createdEvent.id;

    try {
      await canalTexto.setName(`evento-${eventId}`);
      await canalVoz.setName(`evento-${eventId}`);
      console.log(`${user.tag} creó el evento ${eventId} en el servidor ${reaction.message.guild.id}`);

      try {
        const embed = buildEventEmbed({ eventId, creatorTag: user.tag, participantsValue: 'Ningún participante aún' });
        const embedMessage = await canalTexto.send({ embeds: [embed] });
        console.log(`Embed enviado para el evento ${eventId} en el canal ${canalTexto.id}`);

        try {
          await eventsRepository.setEmbedId(eventId, embedMessage.id);
          await embedMessage.react(EMOJIS.JOIN);
          await embedMessage.react(EMOJIS.START);
          await embedMessage.react(EMOJIS.STOP);
        } catch (reactionError) {
          console.error(`Error al añadir reacciones al embed en el servidor ${reaction.message.guild.id}:`, reactionError);
        }
      } catch (embedError) {
        console.error(`Error al enviar embed en el canal ${canalTexto.id} para el evento ${eventId}:`, embedError);
        await sendWarning(reaction.message.channel, `${user.tag}, hubo un error enviando el embed del evento.`);
        await canalTexto.delete().catch(console.error);
        await canalVoz.delete().catch(console.error);
        await reaction.users.remove(user.id);
        await eventsRepository.deleteEvent(eventId).catch((deleteError) =>
          console.error(`Error al eliminar evento ${eventId} de la base de datos:`, deleteError)
        );
        return;
      }

      await sendSuccess(
        reaction.message.channel,
        `${user.tag}, el evento se creó correctamente, ID: ${eventId}. Los canales de texto y voz se crearon correctamente.`
      );
      await reaction.users.remove(user.id);
    } catch (renameError) {
      console.error(`Error al renombrar canales en el servidor ${reaction.message.guild.id}:`, renameError);
      await sendWarning(reaction.message.channel, `${user.tag}, hubo un error creando los canales.`);
      await canalTexto.delete().catch(console.error);
      await canalVoz.delete().catch(console.error);
      await reaction.users.remove(user.id);
      return;
    }

    if (member.voice.channel) {
      member.voice
        .setChannel(canalVoz.id)
        .then(() => console.log('Usuario movido de manera exitosa a', canalVoz.id))
        .catch(console.error);
    }
  } catch (error) {
    console.error(`Error al procesar la reacción de creación de evento en el servidor ${reaction.message?.guild?.id || 'desconocido'}:`, error);
  }
}

function buildTextChannelOverwrites(guild, roleMiembros, roleAmigos) {
  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: roleMiembros.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.SendMessages,
      ],
    },
    {
      id: roleAmigos.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.SendMessages,
      ],
    },
  ];
}

function buildVoiceChannelOverwrites(roleMiembros, roleAmigos) {
  return [
    { id: roleMiembros.guild.roles.everyone.id, deny: ['ViewChannel'] },
    {
      id: roleMiembros.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
      ],
    },
    {
      id: roleAmigos.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
      ],
    },
  ];
}

function buildEventEmbed({ eventId, creatorTag, creatorId, participantsValue, description = 'Para participar reacciona a 🫡', createdAtMs = Date.now() }) {
  return {
    title: `Evento-${eventId}`,
    description,
    color: 0xff0000,
    fields: [
      { name: 'Creado por', value: creatorId ? `<@${creatorId}>` : creatorTag, inline: true },
      { name: 'Hora de creación (UTC)', value: `<t:${Math.floor(createdAtMs / 1000)}:F>`, inline: true },
      { name: 'Participantes', value: participantsValue, inline: false },
    ],
    timestamp: new Date(createdAtMs),
  };
}

module.exports = { handleEventCreationReaction, buildEventEmbed };
