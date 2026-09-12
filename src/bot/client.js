const { Client, GatewayIntentBits, Partials, ActivityType, PresenceUpdateStatus } = require('discord.js');
const env = require('../config/env');

const ACTIVITY_TYPE_MAP = {
  PLAYING: ActivityType.Playing,
  WATCHING: ActivityType.Watching,
  LISTENING: ActivityType.Listening,
  COMPETING: ActivityType.Competing,
  STREAMING: ActivityType.Streaming,
  CUSTOM: ActivityType.Custom,
};

const STATUS_MAP = {
  online: PresenceUpdateStatus.Online,
  idle: PresenceUpdateStatus.Idle,
  dnd: PresenceUpdateStatus.DoNotDisturb,
  invisible: PresenceUpdateStatus.Invisible,
};

function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember],
  });
}

function applyPresence(client) {
  const statusType = env.BOT_STATUS;
  const activityType = env.ACTIVITY_TYPE;
  const activityName = env.ACTIVITY_NAME;

  client.user.setPresence({
    status: STATUS_MAP[statusType],
    activities: [{ name: activityName, type: ACTIVITY_TYPE_MAP[activityType] }],
  });

  console.log(`Bot status: ${statusType} and activity type: ${activityType} and name: ${activityName}`);
}

module.exports = { createClient, applyPresence };
