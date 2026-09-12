const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { formatMoney } = require('../utils/money');
const eventsRepository = require('../repositories/eventsRepository');
const participantsRepository = require('../repositories/participantsRepository');
const bankRepository = require('../repositories/bankRepository');
const { calculatePayouts } = require('../services/payoutService');
const { isAdmin } = require('../utils/permissions');
const { CATEGORIES } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confirmar')
    .setDescription('Confirma y reparte el dinero a los participantes del evento')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const canal = interaction.channel;

      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ No tienes permiso para usar este comando.', flags: 64 });
        return;
      }

      const event = await eventsRepository.findByTextChannel(canal.id);
      if (!event) {
        await interaction.reply({ content: 'No hay evento asignado a este canal.', flags: 64 });
        return;
      }

      if (event.amount <= 0) {
        await interaction.reply({ content: 'El amount del evento es 0 o inválido, no hay nada para repartir.', flags: 64 });
        return;
      }

      const participantRows = await participantsRepository.listParticipantsWithPercentage(event.id);
      if (participantRows.length === 0) {
        await interaction.reply({ content: 'No hay participantes registrados.', flags: 64 });
        return;
      }

      const totalPercentage = await participantsRepository.getTotalPercentage(event.id);
      if (totalPercentage === null) {
        console.log('No hay porcentajes asignados para este evento');
        await interaction.reply({ content: 'Error calculando las partes de cada uno.', flags: 64 });
        return;
      }
      if (totalPercentage <= 0) {
        await interaction.reply({ content: 'No hay porcentajes válidos para repartir.', flags: 64 });
        return;
      }

      const payouts = calculatePayouts(participantRows, event.amount, totalPercentage, Math.floor);
      const bankRows = await bankRepository.bulkAddBalance(payouts.map((p) => ({ userId: p.userId, amount: p.amount })));

      await interaction.reply({
        content: `Se confirmaron los pagos. Saldos actualizados:\n${bankRows
          .map((r) => `<@${r.user_id}> → ${formatMoney(r.balance)}`)
          .join('\n')} \n **EVENTO CERRADO**`,
      });

      const categoria = interaction.guild.channels.cache.find(
        (c) => c.type === 4 && c.name === CATEGORIES.EVENTOS_CERRADOS
      );

      if (!categoria) {
        await interaction.followUp({ content: `No se encontró la categoría **${CATEGORIES.EVENTOS_CERRADOS}**.`, flags: 64 });
        return;
      }

      await canal.setParent(categoria.id);
    } catch (error) {
      console.error('Error en /confirmar:', error);
      await interaction.reply({ content: 'Hubo un error al confirmar los pagos.', flags: 64 });
    }
  },
};
