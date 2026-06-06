const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, "database.json");

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], checklists: [] }, null, 2), "utf-8");
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, "utf-8");

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.users)) data.users = [];
    if (!Array.isArray(data.checklists)) data.checklists = [];
    return data;
  } catch {
    const data = { users: [], checklists: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return data;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function sanitizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeUser(u) {
  return { id: u.id, name: u.name, email: u.email };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

function verifyHashedPassword(password, storedHash) {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = parts[1];
  const hashHex = parts[2];

  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hashHex, "hex");

  if (storedBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}

function isLegacyPlainPassword(storedPassword) {
  return !String(storedPassword || "").startsWith("scrypt:");
}

function requireAuth(req, res, next) {
  const userId = Number(req.header("x-user-id"));
  const userEmail = sanitizeEmail(req.header("x-user-email"));

  if (!userId || !userEmail) {
    return res.status(401).json({ error: "Não autorizado. Faça login." });
  }

  const db = readDB();
  const user = db.users.find(
    (u) => Number(u.id) === userId && sanitizeEmail(u.email) === userEmail
  );

  if (!user) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }

  req.user = safeUser(user);
  next();
}

app.post("/api/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = sanitizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (name.length < 2) {
    return res.status(400).json({ error: "Nome inválido." });
  }

  if (!email.includes("@")) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "Senha muito curta (mín 4)." });
  }

  const db = readDB();
  const exists = db.users.some((u) => sanitizeEmail(u.email) === email);

  if (exists) {
    return res.status(409).json({ error: "E-mail já cadastrado." });
  }

  const user = {
    id: Date.now(),
    name,
    email,
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  writeDB(db);

  return res.status(201).json({ user: safeUser(user) });
});

app.post("/api/login", (req, res) => {
  const email = sanitizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email.includes("@")) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  if (!password) {
    return res.status(400).json({ error: "Senha obrigatória." });
  }

  const db = readDB();
  const userIndex = db.users.findIndex((u) => sanitizeEmail(u.email) === email);
  if (userIndex === -1) {
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  const user = db.users[userIndex];
  let valid = false;

  if (isLegacyPlainPassword(user.password)) {
    valid = String(user.password) === password;

    if (valid) {
      db.users[userIndex].password = hashPassword(password);
      writeDB(db);
    }
  } else {
    valid = verifyHashedPassword(password, user.password);
  }

  if (!valid) {
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  return res.json({ user: safeUser(db.users[userIndex]) });
});

app.post("/api/checklists", requireAuth, (req, res) => {
  const db = readDB();
  const payload = req.body || {};

  if (payload.imagens) {
    if (!Array.isArray(payload.imagens)) {
      return res.status(400).json({ error: "Imagens deve ser um array." });
    }
    for (const img of payload.imagens) {
      if (typeof img !== 'string') {
        return res.status(400).json({ error: "Cada imagem deve ser uma string." });
      }
      if (!img.startsWith('data:image/')) {
        return res.status(400).json({ error: "Imagem deve ser um data URL válido." });
      }
      try {
        const base64 = img.split(',')[1];
        atob(base64);
      } catch (e) {
        return res.status(400).json({ error: "Imagem contém dados inválidos." });
      }
    }
  }

  const desc = String(payload.descricaoAtividade || "").trim();
  if (desc.length < 3) {
    return res.status(400).json({ error: "Informe a Descrição da Atividade (mín 3 caracteres)." });
  }

  const checklist = {
    id: Date.now(),
    userId: req.user.id,
    userEmail: req.user.email,
    userName: req.user.name,
    ...payload,
    createdAt: new Date().toISOString(),
  };

  db.checklists.push(checklist);
  writeDB(db);

  return res.status(201).json({ id: checklist.id });
});

app.get("/api/checklists", requireAuth, (req, res) => {
  const db = readDB();
  let items = Array.isArray(db.checklists) ? db.checklists : [];

  items = items.filter((c) => Number(c.userId) === Number(req.user.id));

  const dateFrom = String(req.query.dateFrom || "").trim();
  const dateTo = String(req.query.dateTo || "").trim();

  if (dateFrom) {
    items = items.filter((c) => String(c.data || "").slice(0, 10) >= dateFrom);
  }

  if (dateTo) {
    items = items.filter((c) => String(c.data || "").slice(0, 10) <= dateTo);
  }

  return res.json({ checklists: items });
});

app.get("/api/checklists/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();

  const item = (db.checklists || []).find((c) => Number(c.id) === id);

  if (!item) {
    return res.status(404).json({ error: "Checklist não encontrado." });
  }

  if (Number(item.userId) !== Number(req.user.id)) {
    return res.status(403).json({ error: "Acesso negado." });
  }

  return res.json(item);
});

app.put("/api/checklists/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();

  const idx = (db.checklists || []).findIndex((c) => Number(c.id) === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Checklist não encontrado." });
  }

  const existing = db.checklists[idx];
  if (Number(existing.userId) !== Number(req.user.id)) {
    return res.status(403).json({ error: "Acesso negado." });
  }

  const payload = req.body || {};

  if (payload.imagens) {
    if (!Array.isArray(payload.imagens)) {
      return res.status(400).json({ error: "Imagens deve ser um array." });
    }
    for (const img of payload.imagens) {
      if (typeof img !== 'string') {
        return res.status(400).json({ error: "Cada imagem deve ser uma string." });
      }
      if (!img.startsWith('data:image/')) {
        return res.status(400).json({ error: "Imagem deve ser um data URL válido." });
      }
      try {
        const base64 = img.split(',')[1];
        atob(base64);
      } catch (e) {
        return res.status(400).json({ error: "Imagem contém dados inválidos." });
      }
    }
  }

  const desc = String(payload.descricaoAtividade || "").trim();

  if (desc.length < 3) {
    return res.status(400).json({ error: "Informe a Descrição da Atividade (mín 3 caracteres)." });
  }

  db.checklists[idx] = {
    ...existing,
    ...payload,
    id,
    userId: existing.userId,
    userEmail: existing.userEmail,
    userName: existing.userName,
    updatedAt: new Date().toISOString(),
  };

  writeDB(db);
  return res.json({ ok: true, id });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/menu.html", (req, res) => {
  res.sendFile(path.join(__dirname, "menu.html"));
});

app.get("/menu", (req, res) => {
  res.sendFile(path.join(__dirname, "menu.html"));
});

app.get("/checklist", (req, res) => {
  res.sendFile(path.join(__dirname, "checklist.html"));
});

app.get("/checklistSimples.html", (req, res) => {
  res.sendFile(path.join(__dirname, "checklistSimples.html"));
});

app.get("/checklist-simples", (req, res) => {
  res.sendFile(path.join(__dirname, "checklistSimples.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});