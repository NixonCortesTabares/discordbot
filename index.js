const env = require('./src/config/env');
env.validateEnv();

const { createClient } = require('./src/bot/client');
const { loadCommands } = require('./src/bot/commandLoader');
const { registerEvents } = require('./src/bot/registerEvents');

const client = createClient();
client.commands = loadCommands();

registerEvents(client);

client.login(env.TOKEN);
