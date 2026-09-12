const { SlashCommandBuilder } = require('discord.js');
const { formatMoney } = require('../utils/money');
const bankRepository = require('../repositories/bankRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bal')
    .setDescription('mostrar el balance actual de un usuario')
    .addUserOption((option) =>
      option.setName('user').setDescription('usuario del que se va a mostrar el balance').setRequired(false)
    ),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const balance = await bankRepository.getBalance(target.id);

      if (balance === null) {
        await interaction.reply({ content: 'el usuario no tiene un balance registrado', flags: 64 });
      } else {
        await interaction.reply({ content: `${target} tiene ${formatMoney(balance)}` });
      }
    } catch (error) {
      await interaction.reply({ content: 'hubo un error al buscar el balance', flags: 64 });
      console.log(error);
    }
  },
};
