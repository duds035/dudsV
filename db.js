const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, 'database.json');

let pool = null;
let usingPg = false;

async function init() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;
  pool = new Pool({ connectionString: databaseUrl });
  usingPg = true;

  // create tables if not exist
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

  // If local database.json exists, import its data (upsert)
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    try {
      const data = JSON.parse(raw || '{}');
      const users = Array.isArray(data.users) ? data.users : [];
      const checklists = Array.isArray(data.checklists) ? data.checklists : [];

      for (const u of users) {
        await pool.query(
          `INSERT INTO users (id, name, email, password, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, password=EXCLUDED.password, created_at=EXCLUDED.created_at`,
          [u.id, u.name, u.email, u.password, u.createdAt ? new Date(u.createdAt) : null]
        );
      }

      for (const c of checklists) {
        await pool.query(
          `INSERT INTO checklists (id, user_id, user_email, user_name, descricao, data, imagens, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id, user_email=EXCLUDED.user_email, user_name=EXCLUDED.user_name, descricao=EXCLUDED.descricao, data=EXCLUDED.data, imagens=EXCLUDED.imagens, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`,
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
    } catch (e) {
      console.error('Falha ao importar database.json para Postgres:', e);
    }
  }
}

async function readDB() {
  if (!usingPg) {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], checklists: [] }, null, 2), 'utf-8');
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data.users)) data.users = [];
      if (!Array.isArray(data.checklists)) data.checklists = [];
      return data;
    } catch (e) {
      const data = { users: [], checklists: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
  }

  // read from postgres
  const usersRes = await pool.query('SELECT id, name, email, password, created_at FROM users');
  const checksRes = await pool.query('SELECT id, user_id, user_email, user_name, descricao, data, imagens, created_at, updated_at FROM checklists');

  const users = usersRes.rows.map((r) => ({ id: Number(r.id), name: r.name, email: r.email, password: r.password, createdAt: r.created_at ? r.created_at.toISOString() : null }));
  const checklists = checksRes.rows.map((r) => ({ id: Number(r.id), userId: Number(r.user_id), userEmail: r.user_email, userName: r.user_name, descricaoAtividade: r.descricao, data: r.data, imagens: r.imagens ? JSON.parse(r.imagens) : null, createdAt: r.created_at ? r.created_at.toISOString() : null, updatedAt: r.updated_at ? r.updated_at.toISOString() : null }));

  return { users, checklists };
}

async function writeDB(data) {
  if (!usingPg) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return;
  }

  // For simplicity, upsert users and checklists
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        await client.query(`INSERT INTO users (id, name, email, password, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, password=EXCLUDED.password, created_at=EXCLUDED.created_at`, [u.id, u.name, u.email, u.password, u.createdAt ? new Date(u.createdAt) : null]);
      }
    }
    if (Array.isArray(data.checklists)) {
      for (const c of data.checklists) {
        await client.query(`INSERT INTO checklists (id, user_id, user_email, user_name, descricao, data, imagens, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id, user_email=EXCLUDED.user_email, user_name=EXCLUDED.user_name, descricao=EXCLUDED.descricao, data=EXCLUDED.data, imagens=EXCLUDED.imagens, created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`, [c.id, c.userId, c.userEmail, c.userName, c.descricaoAtividade || null, c.data || null, c.imagens ? JSON.stringify(c.imagens) : null, c.createdAt ? new Date(c.createdAt) : null, c.updatedAt ? new Date(c.updatedAt) : null]);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { init, readDB, writeDB, usingPg: () => usingPg };
