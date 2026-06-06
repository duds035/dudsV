const AUTH = JSON.parse(localStorage.getItem("auth_user") || "null");
if (!AUTH) window.location.href = "index.html";

document.getElementById("year").textContent = new Date().getFullYear();

const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalFoot = document.getElementById("modalFoot");
const modalClose = document.getElementById("modalClose");

function el(id) {
  return document.getElementById(id);
}

function openModal(title, bodyHtml, footHtml = "") {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml || "";
  modalFoot.innerHTML = footHtml || "";
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalBody.innerHTML = "";
  modalFoot.innerHTML = "";
}

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) {
    closeModal();
  }
});

el("menuUserName").textContent = AUTH.name || "Usuário";
el("menuUserEmail").textContent = AUTH.email || "";

el("goCritico").addEventListener("click", () => {
  window.location.href = "checklist.html";
});

el("goSimples").addEventListener("click", () => {
  window.location.href = "checklistSimples.html";
});

el("btnSuporte").addEventListener("click", () => {
  openModal(
    "Suporte",
    `
      <div class="support-box">
        <p>
          Caso tenha dúvidas sobre o preenchimento dos checklists, recuperação de registros
          ou uso geral da plataforma, entre em contato com o suporte responsável.
        </p>

        <div class="support-contact">
          <div><b>Suporte operacional:</b> equipe responsável pelo sistema</div>
          <div><b>E-mail sugerido:</b> suporte@normatel.com.br</div>
          <div><b>Canal interno:</b> equipe administrativa ou supervisão local</div>
          <div><b>Orientação:</b> informe o tipo de checklist e o número da solicitação ao abrir o chamado.</div>
        </div>
      </div>
    `,
    `
      <button class="btn btn-light" id="supportClose" type="button">Fechar</button>
    `
  );

  el("supportClose").onclick = closeModal;
});

function sair() {
  localStorage.removeItem("auth_user");
  window.location.href = "index.html";
}

el("btnSairNav").addEventListener("click", (e) => {
  e.preventDefault();
  sair();
});