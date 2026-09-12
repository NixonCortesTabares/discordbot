const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { formatMoney } = require('../utils/money');
const parseAmount = require('../utils/parseAmount');
const bankRepository = require('../repositories/bankRepository');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('añadir dinero al usuario a su balance')
    .addUserOption((option) =>
      option.setName('user').setDescription('el usuario al cual se le va a agregar balance').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('dinero').setDescription('cantidad de dinero a añadir').setRequired(true)
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
        await interaction.reply({ content: 'la cantidad debe ser un numero valido, sin decimales y mayor que 0', flags: 64 });
        return;
      }
      if (!Number.isInteger(cantidad)) {
        await interaction.reply({ content: 'la cantidad debe ser un numero entero', flags: 64 });
        return;
      }

      await interaction.reply({ content: 'agregando dinero...', withResponse: true });

      const newBalance = await bankRepository.addBalance(target.id, cantidad);

      await interaction.editReply({
        content: `se añadieron ${formatMoney(cantidad)} a ${target}, su nuevo balance es ${formatMoney(newBalance)}`,
      });
    } catch (error) {
      console.log(`error al ejecutar este comando \n posible informacion necesaria: \n error: ${error}`);
    }
  },
};
