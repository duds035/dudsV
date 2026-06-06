const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, '..', 'database.json');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Defina a variável de ambiente DATABASE_URL antes de rodar.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const data = JSON.parse(raw || '{}');
  const users = Array.isArray(data.users) ? data.users : [];
  const checklists = Array.isArray(data.checklists) ? data.checklists : [];

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        created_at TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id BIGINT PRIMARY KEY,
        user_id BIGINT,
        user_email TEXT,
        user_name TEXT,
        descricao TEXT,
        data TEXT,
        imagens TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, password, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.email, u.password, u.createdAt ? new Date(u.createdAt) : null]
      );
    }

    for (const c of checklists) {
      await pool.query(
        `INSERT INTO checklists (id, user_id, user_email, user_name, descricao, data, imagens, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.userId,
          c.userEmail,
          c.userName,
          c.descricaoAtividade || null,
          c.data || null,
          c.imagens ? JSON.stringify(c.imagens) : null,
          c.createdAt ? new Date(c.createdAt) : null,
          c.updatedAt ? new Date(c.updatedAt) : null,
        ]
      );
    }

    console.log('Importação concluída.');
  } catch (err) {
    console.error('Erro durante importação:', err);
  } finally {
    await pool.end();
  }
}

main();
