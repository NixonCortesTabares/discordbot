const { SlashCommandBuilder } = require('discord.js');
const eventsRepository = require('../repositories/eventsRepository');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcreadorevento')
    .setDescription('Cambia el creador del evento')
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario al cual se le va a ceder el contenido')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const canal = interaction.channel;
      const user = interaction.options.getUser('usuario');

      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ No tienes permiso para usar este comando.', flags: 64 });
        return;
      }

      const updated = await eventsRepository.updateCreatorByTextChannel(canal.id, user.id);

      if (!updated) {
        await interaction.reply({ content: 'No hay un evento activo en este canal.', flags: 64 });
        return;
      }

      await interaction.reply({ content: `✅ <@${user.id}> es ahora el creador de este evento.` });
    } catch (error) {
      console.log('Error en setcreadorevento:', error);
    }
  },
};
