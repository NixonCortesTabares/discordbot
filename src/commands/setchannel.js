const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const serverConfigRepository = require('../repositories/serverConfigRepository');
const { isAdmin } = require('../utils/permissions');
const { EMOJIS } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('NO USAR NO USAR NO USAR NO USAR NO USAR')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('This channel will be used to send the events.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      // NOTA: en el código original este comando queda deshabilitado a propósito
      // (siempre responde "sin permiso" antes de llegar a la lógica real).
      // Se conserva ese comportamiento tal cual — avísame si quieres reactivarlo.
      //await interaction.reply({ content: '❌ No tienes permiso para usar este comando.', flags: 64 });
     // return;

      // eslint-disable-next-line no-unreachable
      if (!interaction.guild) {
        return await interaction.reply({ content: 'Este comando solo puede usarse en un servidor.', flags: 64 });
      }

      const channel = interaction.options.getChannel('canal');
      const guildId = interaction.guild.id;

      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ No tienes permiso para usar este comando.', flags: 64 });
        return;
      }

      if (channel.type !== ChannelType.GuildText) {
        return await interaction.reply({ content: 'Por favor, selecciona un canal de texto válido.', flags: 64 });
      }

      const botPermissions = channel.permissionsFor(interaction.client.user);
      if (!botPermissions.has(['SendMessages', 'ViewChannel', 'AddReactions'])) {
        return await interaction.reply({
          content: 'No tengo permisos para enviar mensajes, ver el canal seleccionado o añadir reacciones. Por favor, verifica los permisos.',
          flags: 64,
        });
      }

      const savedChannel = await serverConfigRepository.setEventChannel(guildId, channel.id);
      if (!savedChannel) {
        throw new Error('No se pudo guardar el canal en la base de datos.');
      }

      await interaction.reply({
        content: `Canal de eventos configurado correctamente: <#${channel.id}>, inicializando....`,
        flags: 64,
        withResponse: true,
      });

      const eventEmbed = new EmbedBuilder()
        .setTitle('Crear Evento')
        .setDescription('Reacciona al emoji para crear un evento')
        .setColor(0xff0000)
        .setTimestamp();

      const eventMessage = await channel.send({ embeds: [eventEmbed] });
      await eventMessage.react(EMOJIS.CREATE_EVENT);

      const savedMessage = await serverConfigRepository.setEventMessage(guildId, eventMessage.id);
      if (!savedMessage) {
        await interaction.editReply({ content: 'NO SE PUDO GUARDAR EL ID DEL MENSAJE', flags: 64 });
        await eventMessage.delete();
        return;
      }

      await interaction.editReply({ content: 'Mensaje desplegado, revisa el canal seleccionado', flags: 64 });
      console.log(`Canal de eventos configurado para el servidor ${guildId}: #${channel.name} (ID: ${channel.id})`);
    } catch (error) {
      console.error(`Error al ejecutar setchannel para el servidor ${interaction.guild?.id || 'desconocido'}:`, error);
      await interaction.reply({ content: 'Hubo un error al configurar el canal. Por favor, intenta de nuevo.', flags: 64 });
    }
  },
};
