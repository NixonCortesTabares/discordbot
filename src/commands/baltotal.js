const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatMoney } = require('../utils/money');
const bankRepository = require('../repositories/bankRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balancetotal')
    .setDescription('Revisar el balance total del gremio'),

  async execute(interaction) {
    try {
      const totalBalance = await bankRepository.getTotalBalance();

      if (totalBalance === 0 || totalBalance === null) {
        await interaction.reply({ content: 'el gremio no tiene balances registrados $0' });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Balance Total del Gremio')
        .setColor(0x00ff00)
        .setDescription('Cantidad total de dinero en el gremio')
        .addFields({ name: 'Balance Total', value: formatMoney(totalBalance), inline: true })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.log('hubo un error mostrando el balance', error);
    }
  },
};
