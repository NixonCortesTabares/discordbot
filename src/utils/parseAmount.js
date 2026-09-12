/**
 * Convierte un string como "10.000" o "10,000" o "10000" a número.
 * Devuelve NaN si el formato no es válido.
 */
const parseAmount = (str) => {
  if (typeof str !== 'string') return NaN;

  str = str.trim();

  // Tres posibles casos:
  //  1. Solo números -> /^\d+$/
  //  2. Números con solo comas -> /^\d{1,3}(,\d{3})*$/
  //  3. Números con solo puntos -> /^\d{1,3}(\.\d{3})*$/
  const regex = /^\d+$|^\d{1,3}(,\d{3})*$|^\d{1,3}(\.\d{3})*$/;

  if (!regex.test(str)) {
    return NaN;
  }

  const n = Number(str.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

module.exports = parseAmount;
