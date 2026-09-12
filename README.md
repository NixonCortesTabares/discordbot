# discordbot

Bot de Discord (Node.js + discord.js v14) con sistema de economía y gestión
de eventos de voz por reacciones.

## Estructura

```
index.js                     → bootstrap: crea el cliente, carga comandos, arranca
src/
  config/
    constants.js              → roles, categorías, estados, emojis (antes strings sueltos)
    env.js                     → validación de variables de entorno
  bot/
    client.js                  → factory del Client de discord.js + presence
    commandLoader.js           → lee src/commands/ y arma la Collection
    deployCommands.js          → registra los slash commands en la API de Discord
    registerEvents.js          → conecta todos los listeners de discord.js
  db/
    pool.js                    → conexión a Postgres (pg.Pool)
    migrations/                → *.sql numerados, uno por tabla
  repositories/                → toda la SQL vive aquí, un archivo por tabla/dominio
  services/                    → lógica de negocio que no depende de discord.js
  commands/                    → un archivo por slash command, delgados (delegan a repos/services)
  events/
    interactionCreate.js       → despacha slash commands
    voiceStateUpdate.js        → cierra sesión de voz al salir del canal del evento
    reactions/
      eventCreationReaction.js → 🎉 crea canales + evento
      eventControlReaction.js  → 🫡 unirse / ▶️ iniciar / ⏹️ cerrar
  utils/                       → helpers puros (dinero, permisos, mensajes auto-borrables)
scripts/
  migrate.js                   → corre las migraciones pendientes contra la BD
```

## Setup

```bash
npm install
cp .env.example .env   # completar TOKEN, CLIENT_ID y credenciales de la BD
npm run migrate         # crea las tablas si no existen
npm start
```

## Base de datos

Las migraciones son archivos `.sql` planos en `src/db/migrations/`, aplicados
en orden por `scripts/migrate.js`, que lleva registro en una tabla
`schema_migrations` para no re-aplicar lo ya corrido.

Tablas: `bank`, `events`, `participants`, `event_participant_sessions`,
`eventmessage`, `configserver`.

Para agregar una tabla o columna nueva: crear el siguiente archivo numerado
(`007_algo.sql`) en `src/db/migrations/` y correr `npm run migrate`.

## Notas de la migración

Este proyecto viene de un `index.js` monolítico de ~1100 líneas sin capas.
Se conservó el comportamiento observable tal cual (mismos mensajes, misma
lógica de negocio), salvo dos bugs corregidos:

- `confirmar.js`: evitaba un doble `interaction.reply()` cuando no existía
  la categoría "Eventos Cerrados" (ahora usa `followUp`).
- `setcreator.js`: el comando no respondía nada en caso de éxito.
