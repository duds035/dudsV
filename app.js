const statusEl = document.getElementById("authStatus");

function showStatus(type, msg) {
  statusEl.classList.remove("hidden", "ok", "err");
  statusEl.classList.add(type === "ok" ? "ok" : "err");
  statusEl.textContent = msg;
}

function clearStatus() {
  statusEl.classList.add("hidden");
  statusEl.textContent = "";
  statusEl.classList.remove("ok", "err");
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok) throw new Error(data?.error || text || `Erro HTTP ${res.status}`);
  return data;
}

// Tabs
const tabs = document.querySelectorAll(".tab");
const panelRegister = document.getElementById("panel-register");
const panelLogin = document.getElementById("panel-login");

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    clearStatus();

    const tab = t.getAttribute("data-tab");
    if (tab === "register") {
      panelRegister.classList.remove("hidden");
      panelLogin.classList.add("hidden");
    } else {
      panelLogin.classList.remove("hidden");
      panelRegister.classList.add("hidden");
    }
  });
});

document.getElementById("goLogin").addEventListener("click", () => {
  tabs.forEach((x) => x.classList.remove("active"));
  document.querySelector('.tab[data-tab="login"]').classList.add("active");
  panelLogin.classList.remove("hidden");
  panelRegister.classList.add("hidden");
  clearStatus();
});

// Register
document.getElementById("btnRegister").addEventListener("click", async () => {
  clearStatus();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPass").value;

  try {
    const r = await apiPost("/api/register", { name, email, password });
    localStorage.setItem("auth_user", JSON.stringify(r.user));
    showStatus("ok", "Cadastro realizado. Redirecionando...");
    setTimeout(() => (window.location.href = "menu.html"), 400);
  } catch (e) {
    showStatus("err", e.message || "Erro ao cadastrar.");
  }
});

// Login
document.getElementById("btnLogin").addEventListener("click", async () => {
  clearStatus();
  const email = document.getElementById("logEmail").value.trim();
  const password = document.getElementById("logPass").value;

  try {
    const r = await apiPost("/api/login", { email, password });
    localStorage.setItem("auth_user", JSON.stringify(r.user));
    showStatus("ok", "Login ok. Redirecionando...");
    setTimeout(() => (window.location.href = "menu.html"), 400);
  } catch (e) {
    showStatus("err", e.message || "Erro ao entrar.");
  }
});