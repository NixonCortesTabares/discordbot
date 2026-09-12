const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eventsRepository = require('../repositories/eventsRepository');
const participantsRepository = require('../repositories/participantsRepository');
const bankRepository = require('../repositories/bankRepository');
const { isAdmin } = require('../utils/permissions');
const { EVENT_STATUS } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setpercentage')
    .setDescription('Actualiza manualmente el porcentaje de un participante en el evento')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El participante al que se le actualizará el porcentaje').setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('porcentaje')
        .setDescription('El porcentaje a asignar')
        .setRequired(true)
        .setMaxValue(100)
        .setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const porcentaje = interaction.options.getInteger('porcentaje');
    const channel = interaction.channel;

    if (!isAdmin(interaction.member)) {
      await interaction.reply({ content: '❌ No tienes permiso para usar este comando.', flags: 64 });
      return;
    }

    const event = await eventsRepository.findByTextChannel(channel.id, EVENT_STATUS.CLOSED);
    if (!event) {
      await interaction.reply({ content: 'El canal no pertenece a un evento existente, o el evento ya cerró', flags: 64 });
      return;
    }

    const existing = await participantsRepository.getParticipant(event.id, user.id);

    if (existing) {
      await participantsRepository.updatePercentage(event.id, user.id, porcentaje);
      return interaction.reply({ content: `✅ Se actualizó el porcentaje de <@${user.id}> a **${porcentaje}%**.` });
    }

    await bankRepository.ensureAccount(user.id);
    await participantsRepository.insertWithPercentage(event.id, user.id, porcentaje);
    return interaction.reply({
      content: `✅ Se agregó a el usuario  <@${user.id}> al evento, con un porcentaje de: **${porcentaje}%**.`,
    });
  },
};
