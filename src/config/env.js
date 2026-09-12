require('dotenv').config();

const REQUIRED_VARS = [
  'TOKEN',
  'CLIENT_ID',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}. Revisa tu archivo .env`
    );
  }
}

module.exports = {
  validateEnv,
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  BOT_STATUS: process.env.BOT_STATUS || 'online',
  ACTIVITY_TYPE: process.env.ACTIVITY_TYPE || 'PLAYING',
  ACTIVITY_NAME: process.env.ACTIVITY_NAME || 'discord',
};
