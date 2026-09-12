/**
 * Calcula cuánto le corresponde a cada participante según su porcentaje.
 * Antes esta misma cuenta (monto * porcentaje / totalPorcentajes) estaba
 * duplicada en confirmar.js (con Math.floor) y simular.js (con Math.round).
 *
 * @param {{user_id: string, percentage: number}[]} participantRows
 * @param {number} totalAmount
 * @param {number} totalPercentage
 * @param {(n: number) => number} roundFn Math.floor o Math.round según el caso de uso
 */
function calculatePayouts(participantRows, totalAmount, totalPercentage, roundFn = Math.floor) {
  return participantRows.map((row) => {
    const percentage = parseFloat(row.percentage) || 0;
    const amount = roundFn((totalAmount * percentage) / totalPercentage);
    return { userId: row.user_id, percentage, amount };
  });
}

module.exports = { calculatePayouts };
