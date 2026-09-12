const { SlashCommandBuilder } = require('discord.js');
const { formatMoney } = require('../utils/money');
const parseAmount = require('../utils/parseAmount');
const bankRepository = require('../repositories/bankRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Este comando sirve para pasarse dinero entre usuarios')
    .addUserOption((option) =>
      option.setName('user').setDescription('usuario al que se va a transferir dinero').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('cantidad').setDescription('cantidad de dinero a transferir').setRequired(true)
    ),

  async execute(interaction) {
    try {
      const userFrom = interaction.user;
      const userTo = interaction.options.getUser('user');
      const cantidad = parseAmount(interaction.options.getString('cantidad'));

      await bankRepository.ensureAccount(userTo.id);

      if (cantidad <= 0 || !Number.isFinite(cantidad)) {
        return await interaction.reply({ content: 'La cantidad debe ser mayor que 0.', flags: 64 });
      }
      if (userFrom.id === userTo.id) {
        return await interaction.reply({ content: 'No puedes transferir dinero a ti mismo.', flags: 64 });
      }

      const result = await bankRepository.transfer(userFrom.id, userTo.id, cantidad);

      if (!result) {
        await interaction.reply({
          content: 'no se pudo realizar la transacción entre los usuarios tal vez no tiene suficiente balance? o el usuario no existe',
          flags: 64,
        });
      } else {
        await interaction.reply({ content: `${userFrom} le pagó ${formatMoney(cantidad)} a ${userTo}` });
      }
    } catch (error) {
      console.log(error);
    }
  },
};
