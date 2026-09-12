const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

function loadCommands() {
  const commands = new Collection();
  const commandFiles = fs.readdirSync(COMMANDS_DIR).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(COMMANDS_DIR, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
    } else {
      console.log(`El comando ${filePath} no tiene la propiedad data o execute`);
    }
  }

  return commands;
}

module.exports = { loadCommands, COMMANDS_DIR };
