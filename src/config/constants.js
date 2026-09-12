// Antes: 'Miembros', 'Amigos', 'Administrador', 'Vendedor', 'ON GOING', etc.
// estaban escritos como strings sueltos por todo el proyecto. Centralizados aquí
// para que un typo o un cambio de nombre de rol se haga en un solo lugar.

const ROLES = {
  MIEMBROS: 'Miembros',
  AMIGOS: 'Amigos',
  ADMINISTRADOR: 'Administrador',
  VENDEDOR: 'Vendedor',
};

const CATEGORIES = {
  EVENTOS: 'Eventos',
  EVENTOS_CERRADOS: 'Eventos Cerrados',
};

const EVENT_STATUS = {
  ON_GOING: 'ON GOING',
  STARTED: 'STARTED',
  CLOSED: 'CLOSED',
  PAUSED: 'PAUSED',
};

const EMOJIS = {
  CREATE_EVENT: '🎉',
  JOIN: '🫡',
  START: '▶️',
  STOP: '⏹️',
  PAUSE: '⏸️',
};

const TIMING = {
  AUTO_DELETE_WARNING_MS: 5000,
  AUTO_DELETE_LONG_MS: 10000,
};

module.exports = { ROLES, CATEGORIES, EVENT_STATUS, EMOJIS, TIMING };
