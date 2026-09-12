const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuevocomando')
    .setDescription('replies with nuevoComando funcionando! and latency information'),
  async execute(interaction) {
    await interaction.reply({ content: 'Pinging...', withResponse: true });
    await interaction.editReply(`nuevoComando funcionando, ademas la latencia es ${Math.round(interaction.client.ws.ping)}ms`);
  },
};
