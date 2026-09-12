/**
 * Runner de migraciones simple, sin dependencias extra.
 *
 * Uso:
 *   node scripts/migrate.js
 *
 * Lee los archivos .sql de src/db/migrations en orden alfabético
 * (por eso el prefijo numérico: 001_, 002_...), y ejecuta solo los
 * que no estén ya registrados en la tabla schema_migrations.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT name FROM schema_migrations');
  return new Set(result.rows.map((row) => row.name));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log('No hay migraciones pendientes, base de datos al día.');
    return;
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ Migración aplicada: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Error aplicando migración ${file}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .then(() => {
    console.log('Migraciones completadas.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fallo el proceso de migraciones:', error);
    process.exit(1);
  });
