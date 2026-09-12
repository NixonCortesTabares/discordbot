const { Events } = require('discord.js');
const { deployCommands } = require('./deployCommands');
const { applyPresence } = require('./client');
const { handleInteractionCreate } = require('../events/interactionCreate');
const { handleEventCreationReaction } = require('../events/reactions/eventCreationReaction');
const { handleEventControlReaction } = require('../events/reactions/eventControlReaction');
const { handleVoiceStateUpdate } = require('../events/voiceStateUpdate');

function registerEvents(client) {
  client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);

    await deployCommands(client.commands);
    console.log('Comandos desplegados globalmente de manera exitosa');

    applyPresence(client);
  });

  client.on(Events.InteractionCreate, handleInteractionCreate);

  // El mensaje original tenía dos listeners de MessageReactionAdd separados
  // (uno para 🎉 en el mensaje de "crear evento", otro para 🫡▶️⏹️ en el
  // embed de un evento ya creado). Cada handler ya filtra por su propio
  // emoji internamente, así que ambos pueden colgarse del mismo evento.
  client.on(Events.MessageReactionAdd, (reaction, user) => handleEventCreationReaction(reaction, user, client));
  client.on(Events.MessageReactionAdd, (reaction, user) => handleEventControlReaction(reaction, user));

  client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
}

module.exports = { registerEvents };
