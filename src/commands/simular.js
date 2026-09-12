const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatMoney } = require('../utils/money');
const parseAmount = require('../utils/parseAmount');
const eventsRepository = require('../repositories/eventsRepository');
const participantsRepository = require('../repositories/participantsRepository');
const { calculatePayouts } = require('../services/payoutService');
const { ROLES } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('simular')
    .setDescription('Simula la cantidad de dinero a repartir')
    .addStringOption((option) =>
      option.setName('valor').setDescription('La cantidad de plata por la que se vendio la tab').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('confirmacion').setDescription('confirmar cantidad').setRequired(true)
    ),
  async execute(interaction) {
    try {
      const canal = interaction.channel;
      const valor = parseAmount(interaction.options.getString('valor'));
      const valorConfirmado = parseAmount(interaction.options.getString('confirmacion'));

      if (valor !== valorConfirmado) {
        await interaction.reply({ content: 'El valor y su confirmacion no son el mismo, rectificar', flags: 64 });
        return;
      }

      const event = await eventsRepository.findEventBySeller(canal.id, interaction.user.id);
      if (!event) {
        await interaction.reply({
          content: `El usuario ${interaction.user} no es el vendedor de este evento, asignelo primero. O tal vez el canal no es un canal asignado a un evento`,
          flags: 64,
        });
        return;
      }

      const totalPercentage = await participantsRepository.getTotalPercentage(event.id);
      if (totalPercentage === null) {
        console.log('No hay porcentajes asignados para este evento');
        return;
      }

      const updated = await eventsRepository.setAmount(event.id, valor);
      if (!updated) {
        await interaction.reply({ content: 'No se pudo actualizar la cantidad!! ERROR, informar', flags: 64 });
        return;
      }

      await interaction.reply({ content: 'Valor confirmado, asignando su parte a los usuarios...' });

      const message = await canal.messages.fetch(updated.embed_id);
      const embedActual = message.embeds[0];
      if (!embedActual) {
        console.log('No se pudo encontrar el embed del evento');
        return;
      }

      const participantRows = await participantsRepository.listParticipantsWithPercentage(event.id);
      const payouts = calculatePayouts(participantRows, valor, totalPercentage, Math.round);

      const participantData =
        payouts.map((p) => `<@${p.userId}>: ${p.percentage}% → ${formatMoney(p.amount)}`).join('\n') ||
        'Ningún participante';

      const embedEditado = EmbedBuilder.from(embedActual)
        .setDescription('Evento finalizado con reparto confirmado')
        .spliceFields(3, 1, { name: 'Participantes', value: participantData, inline: false });

      await message.edit({ embeds: [embedEditado] });

      const adminRole = interaction.guild.roles.cache.find((r) => r.name === ROLES.ADMINISTRADOR);

      await interaction.editReply({
        content: `Tab vendida por ${formatMoney(valor)}, dinero asignado a cada usuario, revisar tabla. \n Administrador usa /confirmar para cerrar el evento <@&${adminRole.id}>`,
      });
    } catch (error) {
      console.log('ha habido un error en simular', error);
    }
  },
};
