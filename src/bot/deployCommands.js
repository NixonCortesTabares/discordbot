const { REST, Routes } = require('discord.js');
const env = require('../config/env');

async function deployCommands(commands) {
  try {
    const commandData = commands.map((command) => command.data.toJSON());
    const rest = new REST().setToken(env.TOKEN);

    console.log(`Started refreshing ${commandData.length} application slash commands globally`);

    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commandData });

    console.log('Succesfully reloaded all commands!');
  } catch (error) {
    console.error(`hubo un error cargando los comandos error: ${error}`);
  }
}

module.exports = { deployCommands };
