const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { formatMoney } = require('../utils/money');
const parseAmount = require('../utils/parseAmount');
const bankRepository = require('../repositories/bankRepository');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('remover dinero del usuario de su balance')
    .addUserOption((option) =>
      option.setName('user').setDescription('el usuario al cual se le va a remover balance').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('dinero').setDescription('cantidad de dinero a remover').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user');
      const cantidad = parseAmount(interaction.options.getString('dinero') || '');

      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ No tienes permiso para usar este comando.', flags: 64 });
        return;
      }
      if (!target) {
        await interaction.reply({ content: 'Usuario no valido', flags: 64 });
        return;
      }
      if (cantidad < 0 || !Number.isFinite(cantidad)) {
        await interaction.reply({ content: 'la cantidad debe ser mayor que 0', flags: 64 });
        return;
      }
      if (!Number.isInteger(cantidad)) {
        await interaction.reply({ content: 'la cantidad debe ser un numero entero', flags: 64 });
        return;
      }

      await interaction.reply({ content: 'removiendo dinero...', withResponse: true });

      const newBalance = await bankRepository.removeBalance(target.id, cantidad);

      if (newBalance === null) {
        await interaction.editReply({ content: `error removiendo el dinero del usuario ${target}, no tiene tanto el manco` });
      } else {
        await interaction.editReply({
          content: `${target} se te fueron removidos ${formatMoney(cantidad)} tu nuevo balance es ${formatMoney(newBalance)}`,
        });
      }
    } catch (error) {
      console.log(`error al ejecutar este comando \n posible informacion necesaria: \n error: ${error}`);
    }
  },
};
