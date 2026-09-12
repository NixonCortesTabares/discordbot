const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  /* ssl: {
      rejectUnauthorized: false, // AWS RDS usa certificados públicos
  }, */
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
  } else {
    console.log('Conexión exitosa. Hora actual en DB:', res.rows[0]);
  }
});

module.exports = pool;
