const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  ...(connectionString ? { connectionString } : {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'contacts_db',
  }),
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5_000),
  ...(isProduction && !process.env.PGSSL_DISABLE ? { ssl: { rejectUnauthorized: false } } : {}),
});

let migrationPromise;

async function runMigrations() {
  if (!migrationPromise) {
    migrationPromise = migrate().catch(error => {
      migrationPromise = null;
      throw error;
    });
  }
  return migrationPromise;
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [746921]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter(file => /^\d+[-_].+\.sql$/.test(file))
      .sort();
    const applied = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.rows.map(row => row.version));

    for (const file of files) {
      const version = file.split('-')[0].split('_')[0];
      if (appliedVersions.has(version)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        console.log(`Applied database migration ${version} (${file})`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [746921]).catch(() => {});
    client.release();
  }
}

async function query(text, params) {
  await runMigrations();
  return pool.query(text, params);
}

module.exports = { pool, query, runMigrations };
