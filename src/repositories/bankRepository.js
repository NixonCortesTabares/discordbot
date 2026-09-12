const pool = require('../db/pool');

/** Crea la cuenta del usuario en $0 si aún no existe. No pisa el balance si ya existe. */
async function ensureAccount(userId, client = pool) {
  await client.query(
    `INSERT INTO bank (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING;`,
    [userId]
  );
}

async function getBalance(userId) {
  const result = await pool.query(`SELECT balance FROM bank WHERE user_id = $1`, [userId]);
  return result.rows[0]?.balance ?? null;
}

async function getTotalBalance() {
  const result = await pool.query(`SELECT SUM(balance) AS total_balance FROM bank;`);
  return result.rows[0].total_balance;
}

/** Suma `amount` (puede insertar la cuenta si no existía). Devuelve el nuevo balance. */
async function addBalance(userId, amount) {
  const query = `
    INSERT INTO bank (user_id, balance)
    VALUES ($1, $2)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = bank.balance + EXCLUDED.balance
    RETURNING balance`;
  const result = await pool.query(query, [userId, amount]);
  return result.rows[0].balance;
}

/** Resta `amount` solo si el usuario tiene fondos suficientes. Devuelve el nuevo balance o null si no alcanzaba. */
async function removeBalance(userId, amount) {
  const query = `
    UPDATE bank
    SET balance = bank.balance - $2
    WHERE bank.balance - $2 >= 0
    AND user_id = $1
    RETURNING balance;`;
  const result = await pool.query(query, [userId, amount]);
  return result.rows[0]?.balance ?? null;
}

/** Transfiere dinero entre dos usuarios en una sola query atómica. Devuelve null si falló (fondos insuficientes o usuario inexistente). */
async function transfer(fromUserId, toUserId, amount) {
  const query = `
    WITH sender AS (
      UPDATE bank
      SET balance = balance - $3
      WHERE user_id = $1
      AND $3 > 0
      AND balance >= $3
      RETURNING user_id, balance
    ),
    receiver AS (
      UPDATE bank
      SET balance = balance + $3
      WHERE user_id = $2
      AND EXISTS (SELECT 1 FROM sender)
      RETURNING user_id, balance
    )
    SELECT * FROM sender
    UNION ALL
    SELECT * FROM receiver;`;
  const result = await pool.query(query, [fromUserId, toUserId, amount]);
  return result.rows.length === 0 ? null : result.rows;
}

async function getLeaderboard(limit = 10) {
  const result = await pool.query(
    `SELECT user_id, balance,
            ROW_NUMBER() OVER (ORDER BY balance DESC) AS rank
     FROM bank
     ORDER BY balance DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getUserRank(userId) {
  const result = await pool.query(
    `WITH ranked AS (
       SELECT user_id, balance,
              ROW_NUMBER() OVER (ORDER BY balance DESC) AS rank
       FROM bank
     )
     SELECT * FROM ranked WHERE user_id = $1;`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/** Inserta varios payouts de una sola vez (usado por /confirmar). rows: [{ userId, amount }] */
async function bulkAddBalance(rows) {
  const flat = [];
  const placeholders = rows
    .map((row, i) => {
      flat.push(row.userId, row.amount);
      const base = i * 2 + 1;
      return `($${base}, $${base + 1})`;
    })
    .join(', ');

  const query = `
    INSERT INTO bank (user_id, balance)
    VALUES ${placeholders}
    ON CONFLICT (user_id)
    DO UPDATE SET balance = bank.balance + EXCLUDED.balance
    RETURNING user_id, balance;`;

  const result = await pool.query(query, flat);
  return result.rows;
}

module.exports = {
  ensureAccount,
  getBalance,
  getTotalBalance,
  addBalance,
  removeBalance,
  transfer,
  getLeaderboard,
  getUserRank,
  bulkAddBalance,
};
