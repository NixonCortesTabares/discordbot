const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatMoney } = require('../utils/money');
const bankRepository = require('../repositories/bankRepository');

module.exports = {
  data: new SlashCommandBuilder().setName('lb').setDescription('Muestra la leaderboard de balances'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;

      const top = await bankRepository.getLeaderboard(10);
      const userData = await bankRepository.getUserRank(userId);

      if (!userData) {
        return interaction.reply('⚠️ No tienes un registro en el banco todavía.');
      }

      let description = '';
      top.forEach((row) => {
        description += `**#${row.rank}** <@${row.user_id}> — 💰 ${formatMoney(row.balance)}\n`;
      });

      description += `\n👤 **Tu posición:** #${userData.rank} — 💰 ${formatMoney(userData.balance)}`;

      const embed = new EmbedBuilder()
        .setTitle('🏆 Leaderboard de Balances')
        .setColor(0x1e90ff)
        .setDescription(description)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply('❌ Ocurrió un error al obtener la leaderboard.');
    }
  },
};
