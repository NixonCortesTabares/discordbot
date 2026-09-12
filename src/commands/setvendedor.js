const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eventsRepository = require('../repositories/eventsRepository');
const { ROLES } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setvendedor')
    .setDescription('Establecer vendedor para el evento')
    .addUserOption((option) =>
      option.setName('user').setDescription('El usuario al que quieres asignar como vendedor').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id);
      const role = interaction.guild.roles.cache.find((r) => r.name === ROLES.VENDEDOR);

      if (!role) {
        return interaction.reply({ content: 'No encontré un rol llamado Vendedor', flags: 64 });
      }
      if (!member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: ` <@${member.id}> no tiene el rol **Vendedor**, no se puede setear, Primero dale rol vendedor.`,
          flags: 64,
        });
      }

      await interaction.reply(`✅ <@${member.id}> asignado como vendedor. Procedo con la configuración....`);

      const assigned = await eventsRepository.assignSellerToClosedEvent(interaction.channel.id, user.id);
      if (!assigned) {
        console.log('No se seteo el vendedor, algo fallo...');
      }

      await interaction.editReply({ content: `<@${member.id}> has sido asignado como vendedor de este evento.` });
    } catch (error) {
      console.log('Error intentando setear al vendedor:', error);
    }
  },
};
