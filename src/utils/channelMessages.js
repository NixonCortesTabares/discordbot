const { TIMING } = require('../config/constants');

/**
 * Envía un mensaje al canal y lo borra automáticamente después de `ms`.
 * Antes este patrón (send -> setTimeout -> delete -> catch) estaba
 * copiado y pegado más de 30 veces en index.js.
 */
async function sendAutoDeleteMessage(channel, content, ms = TIMING.AUTO_DELETE_WARNING_MS) {
  try {
    const message = await channel.send(content);
    setTimeout(() => {
      message.delete().catch((err) =>
        console.log('No se pudo eliminar el mensaje automático:', err.message)
      );
    }, ms);
    return message;
  } catch (sendError) {
    console.log('No se pudo enviar mensaje en el canal:', sendError.message);
    return null;
  }
}

/** Advertencia estándar (5s) */
function sendWarning(channel, content) {
  return sendAutoDeleteMessage(channel, content, TIMING.AUTO_DELETE_WARNING_MS);
}

/** Confirmación de éxito estándar (5s) */
function sendSuccess(channel, content) {
  return sendAutoDeleteMessage(channel, content, TIMING.AUTO_DELETE_WARNING_MS);
}

module.exports = { sendAutoDeleteMessage, sendWarning, sendSuccess };
