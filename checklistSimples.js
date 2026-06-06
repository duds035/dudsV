const AUTH = JSON.parse(localStorage.getItem("auth_user") || "null");
if (!AUTH) window.location.href = "/";

document.getElementById("year").textContent = new Date().getFullYear();

const AUTH_HEADERS = {
  "x-user-id": String(AUTH?.id || ""),
  "x-user-email": String(AUTH?.email || ""),
};

const CARTEIRAS = [
  "AUT-Automação",
  "ALV-Alvenaria",
  "ANA-Análise de Ar",
  "BEB-Purificador de água",
  "CALD-Caldeiraria",
  "CHAV-Chaveiro",
  "CAR-Carpintaria",
  "DC-DATA CENTER",
  "ELE-Elétrica",
  "HID-Hidráulica",
  "LAY-Layout",
  "HIG-Higienização",
  "MSG-Mensageria",
  "MEC-Eletromecânica",
  "MOB-Mobiliário",
  "LIMP-Conservação e Limpeza",
  "MOV-Movimentação de Itens",
  "OPE-Operação",
  "PIN-Pintura Industrial",
  "PINC-Pintura Civil",
  "PLC-Placas",
  "REF-Refrigeração",
  "VER-Áreas Verdes",
  "VET-Pragas e Vetores",
];

const statusEl = document.getElementById("status");
const currentIdTxt = document.getElementById("currentIdTxt");
const userTxt = document.getElementById("userTxt");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalFoot = document.getElementById("modalFoot");
const modalClose = document.getElementById("modalClose");

const etapasBody = document.getElementById("etapasBody");

let currentId = null;
let etapaCount = 0;
let locationMap = null;
let locationMarker = null;

userTxt.textContent = `${AUTH.name} (${AUTH.email})`;
currentIdTxt.textContent = "—";

function el(id) {
  return document.getElementById(id);
}

function getInputValue(id) {
  const node = el(id);
  return node ? node.value.trim() : "";
}

function setInputValue(id, value) {
  const node = el(id);
  if (node) node.value = value || "";
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocalização não disponível neste navegador."));
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => reject(new Error(error.message || "Falha ao obter localização.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

function setLocationFields(position) {
  if (!position?.coords) return;
  setInputValue("locationLatitude", String(position.coords.latitude.toFixed(6)));
  setInputValue("locationLongitude", String(position.coords.longitude.toFixed(6)));
  updateLocationMap(position.coords.latitude, position.coords.longitude);
}

async function fetchLocation() {
  clearStatus();
  try {
    const position = await getCurrentLocation();
    setLocationFields(position);
    showStatus("ok", "Localização capturada com sucesso.");
  } catch (err) {
    showStatus("err", err.message || "Não foi possível capturar a localização.");
  }
}

function initLocationMap() {
  const mapEl = el("locationMap");
  if (!mapEl || typeof L === "undefined") return;

  locationMap = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
  }).setView([0, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(locationMap);

  locationMarker = L.marker([0, 0], { opacity: 0 }).addTo(locationMap);

  setTimeout(() => {
    if (locationMap) locationMap.invalidateSize();
  }, 200);
}

function updateLocationMap(latitude, longitude) {
  if (!locationMap || latitude == null || longitude == null) return;

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  if (!locationMarker) {
    locationMarker = L.marker([lat, lng]).addTo(locationMap);
  } else {
    locationMarker.setLatLng([lat, lng]).setOpacity(1);
  }

  locationMap.setView([lat, lng], 16);
}

function refreshLocationMap() {
  const lat = getInputValue("locationLatitude");
  const lng = getInputValue("locationLongitude");
  if (lat && lng) updateLocationMap(lat, lng);
}

function fillCarteiraSelect(selectId, includeAllOption = false) {
  const node = el(selectId);
  if (!node) return;

  const currentValue = node.value || "";
  const firstLabel = includeAllOption ? "Todas as carteiras" : "Selecione uma carteira";

  node.innerHTML = `
    <option value="">${firstLabel}</option>
    ${CARTEIRAS.map((item) => `<option value="${item}">${item}</option>`).join("")}
  `;

  node.value = currentValue;
}

fillCarteiraSelect("carteira");
window.addEventListener("load", initLocationMap);

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
  if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) closeModal();
});

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setRadio(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((r) => {
    r.checked = false;
  });

  if (!value) return;

  const target = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (target) target.checked = true;
}

function calcDur(ini, fim) {
  if (!ini || !fim) return "00:00";

  const [ih, im] = ini.split(":").map(Number);
  const [fh, fm] = fim.split(":").map(Number);

  let diff = fh * 60 + fm - (ih * 60 + im);
  if (diff < 0) diff += 24 * 60;

  const h = String(Math.floor(diff / 60)).padStart(2, "0");
  const m = String(diff % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function bindEtapaEvents(index) {
  const ini = el(`ini${index}`);
  const fim = el(`fim${index}`);
  const dur = el(`dur${index}`);
  const btnRemove = el(`btnRemoveEtapa${index}`);

  const updateDuration = () => {
    if (dur && ini && fim) {
      dur.value = calcDur(ini.value, fim.value);
    }
  };

  if (ini) ini.addEventListener("change", updateDuration);
  if (fim) fim.addEventListener("change", updateDuration);

  if (btnRemove) {
    btnRemove.addEventListener("click", () => removeEtapa(index));
  }
}

function createEtapaRow(index, data = {}) {
  const tr = document.createElement("tr");
  tr.setAttribute("data-etapa", String(index));
  tr.innerHTML = `
    <td class="simple-step-label-cell">Etapa ${index}:</td>
    <td class="simple-step-desc-cell">
      <input id="etapaDesc${index}" type="text" />
    </td>
    <td class="simple-step-time-cell">
      <input id="ini${index}" type="time" />
    </td>
    <td class="simple-step-time-cell">
      <input id="fim${index}" type="time" />
    </td>
    <td class="simple-step-duration-cell">
      <input id="dur${index}" type="text" readonly />
    </td>
    <td class="simple-step-action-cell no-print">
      <button class="btn btn-light simple-remove-btn" id="btnRemoveEtapa${index}" type="button">Remover</button>
    </td>
  `;

  etapasBody.appendChild(tr);

  setInputValue(`etapaDesc${index}`, data.descricao || "");
  if (el(`ini${index}`)) el(`ini${index}`).value = data.inicio || "";
  if (el(`fim${index}`)) el(`fim${index}`).value = data.termino || "";
  if (el(`dur${index}`)) {
    el(`dur${index}`).value = data.duracao || calcDur(data.inicio || "", data.termino || "");
  }

  bindEtapaEvents(index);
}

function renumberEtapas() {
  const rows = Array.from(etapasBody.querySelectorAll("tr"));

  rows.forEach((row, idx) => {
    const number = idx + 1;
    row.setAttribute("data-etapa", String(number));

    const label = row.querySelector(".simple-step-label-cell");
    const desc = row.querySelector('input[id^="etapaDesc"]');
    const ini = row.querySelector('input[id^="ini"]');
    const fim = row.querySelector('input[id^="fim"]');
    const dur = row.querySelector('input[id^="dur"]');
    const btn = row.querySelector('button[id^="btnRemoveEtapa"]');

    if (label) label.textContent = `Etapa ${number}:`;
    if (desc) desc.id = `etapaDesc${number}`;
    if (ini) ini.id = `ini${number}`;
    if (fim) fim.id = `fim${number}`;
    if (dur) dur.id = `dur${number}`;
    if (btn) btn.id = `btnRemoveEtapa${number}`;
  });

  etapaCount = rows.length;
  rows.forEach((_, idx) => bindEtapaEvents(idx + 1));
}

function addEtapa(data = {}) {
  etapaCount += 1;
  createEtapaRow(etapaCount, data);
}

function removeEtapa(index) {
  const row = etapasBody.querySelector(`tr[data-etapa="${index}"]`);
  if (!row) return;

  if (etapaCount <= 1) {
    showStatus("err", "É necessário manter pelo menos uma etapa.");
    return;
  }

  row.remove();
  renumberEtapas();
}

function initEtapas(total = 9) {
  etapasBody.innerHTML = "";
  etapaCount = 0;
  for (let i = 1; i <= total; i++) {
    addEtapa();
  }
}

initEtapas(9);

function addImagemInput() {
  const container = document.querySelector(".fotos-preview");
  const div = document.createElement("div");
  div.className = "foto-item";
  div.innerHTML = `
    <input type="file" accept="image/*" class="imagem-file" />
    <button class="btn btn-light foto-remove-btn no-print" type="button">Remover</button>
  `;
  container.appendChild(div);
  const fileInput = div.querySelector(".imagem-file");
  const removeBtn = div.querySelector(".foto-remove-btn");
  removeBtn.addEventListener("click", () => {
    div.remove();
  });
}

el("btnAddImagem").addEventListener("click", addImagemInput);

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function collectImagens() {
  const containers = document.querySelectorAll(".fotos-preview .foto-item");
  const imgs = [];
  for (const cont of containers) {
    const fileInput = cont.querySelector(".imagem-file");
    const img = cont.querySelector("img");
    if (fileInput && fileInput.files[0]) {
      const base64 = await fileToBase64(fileInput.files[0]);
      imgs.push(base64);
    } else if (img) {
      imgs.push(img.src);
    }
  }
  return imgs;
}

function setImagens(imgs) {
  const container = document.querySelector(".fotos-preview");
  container.innerHTML = "";
  if (!Array.isArray(imgs)) return;
  imgs.forEach(base64 => {
    const div = document.createElement("div");
    div.className = "foto-item";
    div.innerHTML = `
      <img src="${base64}" />
      <button class="btn btn-light foto-remove-btn no-print" type="button">Remover</button>
    `;
    container.appendChild(div);
    const removeBtn = div.querySelector(".foto-remove-btn");
    removeBtn.addEventListener("click", () => {
      div.remove();
    });
  });
}

const infoAdicionaisBody = el("infoAdicionaisBody");
if (infoAdicionaisBody) {
  for (let i = 1; i <= 8; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input class="line-input" id="infoAdicional${i}" type="text" /></td>`;
    infoAdicionaisBody.appendChild(tr);
  }
}

const materiaisBody = el("materiaisBody");
if (materiaisBody) {
  for (let i = 1; i <= 16; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="line-input" id="matQtd${i}" type="text" /></td>
      <td><input class="line-input" id="matUnd${i}" type="text" /></td>
      <td><input class="line-input" id="matDesc${i}" type="text" /></td>
      <td><input class="line-input" id="matSep${i}" type="text" /></td>
    `;
    materiaisBody.appendChild(tr);
  }
}

function collectListaInputs(total, mapper) {
  const arr = [];
  for (let i = 1; i <= total; i++) {
    arr.push(mapper(i));
  }
  return arr;
}

const RESOURCE_MAP = [
  ["EPIs e EPCs", "r1"],
  ["Serra Mármore", "r2"],
  ["Carrinho de Mão", "r3"],
  ["Escada", "r4"],
  ["Martelete", "r5"],
  ["Espátula", "r6"],
  ["Ferramentas Manuais", "r7"],
  ["Talhadeira / Martelo", "r8"],
  ["Balde", "r9"],
  ["Contenção de Resíduos", "r10"],
  ["Furadeira", "r11"],
  ["Estopa", "r12"],
  ["Instrumento de Medição", "r13"],
  ["Capacete de Segurança", "r14"],
  ["Bota de Segurança", "r15"],
  ["Uniforme RF", "r16"],
  ["Protetor Auricular", "r17"],
  ["Óculos de Segurança", "r18"],
  ["Cinto de Segurança", "r19"],
  ["Luva", "r20"],
];

function collectResources() {
  return RESOURCE_MAP.map(([nome, id]) => ({
    nome,
    disponivel: !!el(id)?.checked,
  }));
}

function setResources(recursos) {
  document.querySelectorAll('input[type="checkbox"]').forEach((c) => {
    c.checked = false;
  });

  if (!Array.isArray(recursos)) return;

  const map = Object.fromEntries(RESOURCE_MAP.map(([nome, id]) => [nome, id]));
  recursos.forEach((item) => {
    const id = map[item.nome];
    if (id && el(id)) {
      el(id).checked = !!item.disponivel;
    }
  });
}

function collectEtapas() {
  const etapas = [];
  for (let i = 1; i <= etapaCount; i++) {
    etapas.push({
      etapa: i,
      descricao: getInputValue(`etapaDesc${i}`),
      inicio: el(`ini${i}`)?.value || "",
      termino: el(`fim${i}`)?.value || "",
      duracao: el(`dur${i}`)?.value || "00:00",
    });
  }
  return etapas;
}

function setEtapas(etapas) {
  const lista =
    Array.isArray(etapas) && etapas.length
      ? etapas
      : Array.from({ length: 9 }, (_, i) => ({
          etapa: i + 1,
          descricao: "",
          inicio: "",
          termino: "",
          duracao: "00:00",
        }));

  etapasBody.innerHTML = "";
  etapaCount = 0;

  lista.forEach((item) => {
    addEtapa({
      descricao: item.descricao || "",
      inicio: item.inicio || "",
      termino: item.termino || "",
      duracao: item.duracao || calcDur(item.inicio || "", item.termino || ""),
    });
  });
}

async function buildPayload() {
  return {
    formType: "simples",
    descricaoAtividade: getInputValue("descricaoAtividade"),
    responsavelPlanejamento: getInputValue("responsavelPlanejamento"),
    requisitante: getInputValue("requisitante"),
    horarioDuracao: getInputValue("horarioDuracao"),
    executante: getInputValue("executante"),
    numSolicitacao: getInputValue("numSolicitacao"),
    carteira: getInputValue("carteira"),
    localAtividade: getInputValue("localAtividade"),
    location: {
      latitude: getInputValue("locationLatitude"),
      longitude: getInputValue("locationLongitude"),
    },
    dataInicio: el("dataInicio")?.value || "",
    dataFim: el("dataFim")?.value || "",
    data: el("dataInicio")?.value || "",

    etapas: collectEtapas(),

    q2: { resposta: getRadio("q2") },
    q3: { resposta: getRadio("q3") },

    recursos: collectResources(),
    outrosRecursos: getInputValue("outrosRecursos"),

    q5: { resposta: getRadio("q5") },
    q6: { resposta: getRadio("q6") },

    executanteSubstituto: getInputValue("executanteSubstituto"),
    assinaturaResponsavel: getInputValue("assinaturaResponsavel"),

    pagina2: {
      meta: {
        responsavel: getInputValue("ftResponsavel"),
        dataAvaliacao: getInputValue("ftDataAvaliacao"),
        tempoExec: getInputValue("ftTempoExec"),
        localAtividade: getInputValue("ftLocalAtividade"),
        numSolicitacao: getInputValue("ftNumSolicitacao"),
        equipeNecessaria: getInputValue("ftEquipeNecessaria"),
      },

      servico: {
        pemt: {
          resposta: getRadio("ft1"),
          obs: getInputValue("ft1obs"),
        },
        limpezaArea: {
          resposta: getRadio("ft2"),
          obs: getInputValue("ft2obs"),
        },
        comunicacoesOperantes: {
          resposta: getRadio("ft3"),
          obs: getInputValue("ft3obs"),
        },
        visitaTecnica: {
          resposta: getRadio("ft4"),
          obs: getInputValue("ft4obs"),
        },
        montagemAndaime: {
          resposta: getRadio("ft5"),
          obs: getInputValue("ft5obs"),
        },
        visitaSMS: {
          resposta: getRadio("ft6"),
          obs: getInputValue("ft6obs"),
        },
        caminhaoMunck: {
          resposta: getRadio("ft7"),
          obs: getInputValue("ft7obs"),
        },
        veiculo: {
          resposta: getRadio("ft8"),
          obs: getInputValue("ft8obs"),
        },
        lubrif: {
          resposta: getRadio("ft9"),
          obs: getInputValue("ft9obs"),
        },
        art: {
          resposta: getRadio("ft10"),
          obs: getInputValue("ft10obs"),
        },
        desligamentoEletrico: {
          resposta: getRadio("ft11"),
          obs: getInputValue("ft11obs"),
        },
        desligamentoSDAI: {
          resposta: getRadio("ft12"),
          obs: getInputValue("ft12obs"),
        },
        desligamentoPM2007: {
          resposta: getRadio("ft13"),
          obs: getInputValue("ft13obs"),
        },
        remanejamentoMobiliario: {
          resposta: getRadio("ft14"),
          obs: getInputValue("ft14obs"),
        },

        tamanho: getInputValue("ftTamanho"),
        fimSemana: getRadio("ftFimSemana"),
        fimSemanaObs: getInputValue("ftFimSemanaObs"),

        materialCompra: getInputValue("ftMaterialCompra"),
        locacao: getInputValue("ftLocacao"),

        apoioOutraEquipe: {
          resposta: getRadio("ft15"),
          equipe: getInputValue("ft15obs"),
          descricao: getInputValue("ftApoioDescricao"),
        },
      },

      informacoesAdicionais: collectListaInputs(8, (i) => getInputValue(`infoAdicional${i}`)),

      materiais: collectListaInputs(16, (i) => ({
        qtd: getInputValue(`matQtd${i}`),
        und: getInputValue(`matUnd${i}`),
        descricao: getInputValue(`matDesc${i}`),
        separado: getInputValue(`matSep${i}`),
      })),
    },

    imagens: await collectImagens(),
  };
}

function applyPayload(data) {
  setInputValue("descricaoAtividade", data.descricaoAtividade || "");
  setInputValue("responsavelPlanejamento", data.responsavelPlanejamento || "");
  setInputValue("requisitante", data.requisitante || "");
  setInputValue("horarioDuracao", data.horarioDuracao || "");
  setInputValue("executante", data.executante || "");
  setInputValue("numSolicitacao", data.numSolicitacao || "");
  setInputValue("carteira", data.carteira || "");
  setInputValue("localAtividade", data.localAtividade || "");
  setInputValue("locationLatitude", data?.location?.latitude || "");
  setInputValue("locationLongitude", data?.location?.longitude || "");
  refreshLocationMap();

  if (el("dataInicio")) el("dataInicio").value = data.dataInicio || "";
  if (el("dataFim")) el("dataFim").value = data.dataFim || "";

  setEtapas(data.etapas);
  setRadio("q2", data?.q2?.resposta);
  setRadio("q3", data?.q3?.resposta);
  setResources(data.recursos);
  setInputValue("outrosRecursos", data.outrosRecursos || "");
  setRadio("q5", data?.q5?.resposta);
  setRadio("q6", data?.q6?.resposta);
  setInputValue("executanteSubstituto", data.executanteSubstituto || "");
  setInputValue("assinaturaResponsavel", data.assinaturaResponsavel || "");

  const p2 = data?.pagina2 || {};
  const meta = p2.meta || {};
  const serv = p2.servico || {};

  setInputValue("ftResponsavel", meta.responsavel || "");
  setInputValue("ftDataAvaliacao", meta.dataAvaliacao || "");
  setInputValue("ftTempoExec", meta.tempoExec || "");
  setInputValue("ftLocalAtividade", meta.localAtividade || "");
  setInputValue("ftNumSolicitacao", meta.numSolicitacao || "");
  setInputValue("ftEquipeNecessaria", meta.equipeNecessaria || "");

  setRadio("ft1", serv?.pemt?.resposta);
  setInputValue("ft1obs", serv?.pemt?.obs || "");
  setRadio("ft2", serv?.limpezaArea?.resposta);
  setInputValue("ft2obs", serv?.limpezaArea?.obs || "");
  setRadio("ft3", serv?.comunicacoesOperantes?.resposta);
  setInputValue("ft3obs", serv?.comunicacoesOperantes?.obs || "");
  setRadio("ft4", serv?.visitaTecnica?.resposta);
  setInputValue("ft4obs", serv?.visitaTecnica?.obs || "");
  setRadio("ft5", serv?.montagemAndaime?.resposta);
  setInputValue("ft5obs", serv?.montagemAndaime?.obs || "");
  setRadio("ft6", serv?.visitaSMS?.resposta);
  setInputValue("ft6obs", serv?.visitaSMS?.obs || "");
  setRadio("ft7", serv?.caminhaoMunck?.resposta);
  setInputValue("ft7obs", serv?.caminhaoMunck?.obs || "");
  setRadio("ft8", serv?.veiculo?.resposta);
  setInputValue("ft8obs", serv?.veiculo?.obs || "");
  setRadio("ft9", serv?.lubrif?.resposta);
  setInputValue("ft9obs", serv?.lubrif?.obs || "");
  setRadio("ft10", serv?.art?.resposta);
  setInputValue("ft10obs", serv?.art?.obs || "");
  setRadio("ft11", serv?.desligamentoEletrico?.resposta);
  setInputValue("ft11obs", serv?.desligamentoEletrico?.obs || "");
  setRadio("ft12", serv?.desligamentoSDAI?.resposta);
  setInputValue("ft12obs", serv?.desligamentoSDAI?.obs || "");
  setRadio("ft13", serv?.desligamentoPM2007?.resposta);
  setInputValue("ft13obs", serv?.desligamentoPM2007?.obs || "");
  setRadio("ft14", serv?.remanejamentoMobiliario?.resposta);
  setInputValue("ft14obs", serv?.remanejamentoMobiliario?.obs || "");

  setInputValue("ftTamanho", serv.tamanho || "");
  setRadio("ftFimSemana", serv.fimSemana);
  setInputValue("ftFimSemanaObs", serv.fimSemanaObs || "");
  setInputValue("ftMaterialCompra", serv.materialCompra || "");
  setInputValue("ftLocacao", serv.locacao || "");
  setRadio("ft15", serv?.apoioOutraEquipe?.resposta);
  setInputValue("ft15obs", serv?.apoioOutraEquipe?.equipe || "");
  setInputValue("ftApoioDescricao", serv?.apoioOutraEquipe?.descricao || "");

  const infos = Array.isArray(p2.informacoesAdicionais) ? p2.informacoesAdicionais : [];
  for (let i = 1; i <= 8; i++) {
    setInputValue(`infoAdicional${i}`, infos[i - 1] || "");
  }

  const mats = Array.isArray(p2.materiais) ? p2.materiais : [];
  for (let i = 1; i <= 16; i++) {
    const m = mats[i - 1] || {};
    setInputValue(`matQtd${i}`, m.qtd || "");
    setInputValue(`matUnd${i}`, m.und || "");
    setInputValue(`matSep${i}`, m.separado || "");
  }

  setImagens(data.imagens || []);
}

function clearForm() {
  [
    "descricaoAtividade",
    "responsavelPlanejamento",
    "requisitante",
    "horarioDuracao",
    "executante",
    "numSolicitacao",
    "carteira",
    "localAtividade",
    "dataInicio",
    "dataFim",
    "outrosRecursos",
    "executanteSubstituto",
    "assinaturaResponsavel",

    "ftResponsavel",
    "ftDataAvaliacao",
    "ftTempoExec",
    "ftLocalAtividade",
    "ftNumSolicitacao",
    "ftEquipeNecessaria",
    "ft1obs",
    "ft2obs",
    "ft3obs",
    "ft4obs",
    "ft5obs",
    "ft6obs",
    "ft7obs",
    "ft8obs",
    "ft9obs",
    "ft10obs",
    "ft11obs",
    "ft12obs",
    "ft13obs",
    "ft14obs",
    "ftTamanho",
    "ftFimSemanaObs",
    "locationLatitude",
    "locationLongitude",
    "ftMaterialCompra",
    "ftLocacao",
    "ft15obs",
    "ftApoioDescricao",
  ].forEach((id) => setInputValue(id, ""));

  document.querySelectorAll('input[type="radio"]').forEach((r) => {
    r.checked = false;
  });

  document.querySelectorAll('input[type="checkbox"]').forEach((c) => {
    c.checked = false;
  });

  setEtapas([]);

  for (let i = 1; i <= 8; i++) {
    setInputValue(`infoAdicional${i}`, "");
  }

  for (let i = 1; i <= 16; i++) {
    setInputValue(`matQtd${i}`, "");
    setInputValue(`matUnd${i}`, "");
    setInputValue(`matDesc${i}`, "");
    setInputValue(`matSep${i}`, "");
  }

  document.querySelector(".fotos-preview").innerHTML = "";
}

async function apiRequest(method, path, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(path, options);
  const text = await res.text();

  let data = {};
  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok) throw new Error(data?.error || text || `Erro HTTP ${res.status}`);
  return data;
}

async function loadBySolicitacao(numSolicitacao, carteira = "") {
  clearStatus();

  const data = await apiRequest("GET", "/api/checklists");

  const item = (data.checklists || []).find((c) => {
    const sameSolic = String(c.numSolicitacao || "").trim() === String(numSolicitacao || "").trim();
    const sameCarteira = !carteira || String(c.carteira || "") === carteira;
    return c.formType === "simples" && sameSolic && sameCarteira;
  });

  if (!item) {
    throw new Error("Nenhum checklist simples encontrado com esse filtro.");
  }

  applyPayload(item);
  currentId = Number(item.id);
  currentIdTxt.textContent = String(item.numSolicitacao || "—");
  showStatus("ok", `Checklist carregado. Solicitação: ${numSolicitacao}`);
}

async function modalMeusChecklists() {
  openModal(
    "Meus checklists simples",
    `
      <div class="m-grid">
        <div class="m-row">
          <label class="m-lbl">Data (de)</label>
          <input class="m-input" id="m_df" type="date" />
        </div>
        <div class="m-row">
          <label class="m-lbl">Data (até)</label>
          <input class="m-input" id="m_dt" type="date" />
        </div>
        <div class="m-row">
          <label class="m-lbl">Carteira</label>
          <select class="m-input" id="m_carteira"></select>
        </div>
        <div class="m-row m-grow">
          <label class="m-lbl">Buscar</label>
          <input class="m-input" id="m_q" type="text" placeholder="Solicitação, carteira, descrição, local..." />
        </div>
        <div class="m-row">
          <label class="m-lbl">&nbsp;</label>
          <button class="btn btn-light" id="m_filtrar" type="button">Filtrar</button>
        </div>
      </div>
      <div class="m-list" id="m_list">Carregando...</div>
    `,
    `
      <button class="btn btn-light" id="m_close" type="button">Fechar</button>
    `
  );

  el("m_close").onclick = closeModal;
  fillCarteiraSelect("m_carteira", true);

  async function loadList() {
    const df = el("m_df").value;
    const dt = el("m_dt").value;
    const carteira = el("m_carteira").value;
    const q = (el("m_q").value || "").trim().toLowerCase();

    const qs = new URLSearchParams();
    if (df) qs.set("dateFrom", df);
    if (dt) qs.set("dateTo", dt);

    const url = qs.toString() ? `/api/checklists?${qs.toString()}` : "/api/checklists";
    const data = await apiRequest("GET", url);

    let items = (data.checklists || []).filter((item) => item.formType === "simples");

    if (carteira) {
      items = items.filter((c) => String(c.carteira || "") === carteira);
    }

    if (q) {
      items = items.filter((c) => {
        const blob = [
          c.numSolicitacao,
          c.carteira,
          c.descricaoAtividade,
          c.localAtividade,
          c.requisitante,
          c.responsavelPlanejamento,
        ]
          .join(" ")
          .toLowerCase();

        return blob.includes(q);
      });
    }

    items.sort((a, b) => Number(b.id) - Number(a.id));

    const wrap = el("m_list");
    if (!items.length) {
      wrap.innerHTML = `<div class="m-empty">Nenhum checklist simples encontrado.</div>`;
      return;
    }

    wrap.innerHTML = items
      .map((c) => {
        const dtShow = c.dataInicio || c.data || c.createdAt?.slice(0, 10) || "";
        const solic = escapeHtml(c.numSolicitacao || "—");
        return `
          <div class="m-item">
            <div class="m-item-left">
              <div class="m-item-title">Solicitação: ${solic} — ${escapeHtml(c.descricaoAtividade || "")}</div>
              <div class="m-item-sub">Data: ${escapeHtml(dtShow)} • Carteira: ${escapeHtml(c.carteira || "—")} • Local: ${escapeHtml(c.localAtividade || "")}</div>
            </div>
            <div class="m-item-right">
              <button class="btn btn-primary m-open" data-solic="${escapeHtml(c.numSolicitacao || "")}" data-carteira="${escapeHtml(c.carteira || "")}" type="button">Abrir</button>
            </div>
          </div>
        `;
      })
      .join("");

    wrap.querySelectorAll(".m-open").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const num = btn.getAttribute("data-solic") || "";
        const cart = btn.getAttribute("data-carteira") || "";
        try {
          await loadBySolicitacao(num, cart);
          closeModal();
        } catch (e) {
          alert(e.message || "Erro ao abrir.");
        }
      });
    });
  }

  el("m_filtrar").onclick = () => loadList().catch((e) => alert(e.message));
  el("m_q").addEventListener("input", () => loadList().catch(() => {}));

  loadList().catch((e) => alert(e.message || "Erro ao listar."));
}

function modalImprimir() {
  openModal(
    "Imprimir checklist simples",
    `<div class="m-help">Confirme para abrir a impressão do checklist simples atual.</div>`,
    `
      <button class="btn btn-light" id="m_cancel" type="button">Cancelar</button>
      <button class="btn btn-primary" id="m_print" type="button">Imprimir</button>
    `
  );

  el("m_cancel").onclick = closeModal;
  el("m_print").onclick = () => {
    closeModal();
    window.print();
  };
}

async function saveChecklist() {
  clearStatus();
  const payload = await buildPayload();

  if (!payload.descricaoAtividade || payload.descricaoAtividade.length < 3) {
    showStatus("err", "Preencha a Descrição da Atividade (mín 3 caracteres).");
    return;
  }

  if (!payload.carteira) {
    showStatus("err", "Selecione uma carteira.");
    return;
  }

  if (!payload.numSolicitacao) {
    showStatus("err", "Preencha o Nº da solicitação.");
    return;
  }

  try {
    if (currentId) {
      await apiRequest("PUT", `/api/checklists/${currentId}`, payload);
      currentIdTxt.textContent = payload.numSolicitacao || "—";
      showStatus("ok", `Checklist simples atualizado com sucesso. Solicitação: ${payload.numSolicitacao}`);
    } else {
      const r = await apiRequest("POST", "/api/checklists", payload);
      currentId = Number(r.id) || null;
      currentIdTxt.textContent = payload.numSolicitacao || "—";
      showStatus("ok", `Checklist simples salvo com sucesso. Solicitação: ${payload.numSolicitacao}`);
    }
  } catch (e) {
    showStatus("err", e.message || "Erro ao salvar.");
  }
}

function sair() {
  localStorage.removeItem("auth_user");
  window.location.href = "/";
}

el("btnSalvar").addEventListener("click", saveChecklist);
el("btnAbrirModalLista").addEventListener("click", () => modalMeusChecklists());
el("btnImprimirModal").addEventListener("click", modalImprimir);
el("btnAddEtapa").addEventListener("click", () => addEtapa());
el("btnGetLocation").addEventListener("click", fetchLocation);

el("btnNovo").addEventListener("click", () => {
  currentId = null;
  currentIdTxt.textContent = "—";
  clearForm();
  clearStatus();
  showStatus("ok", "Novo checklist simples iniciado.");
});

el("btnSair").addEventListener("click", sair);

const btnSairNav = el("btnSairNav");
if (btnSairNav) {
  btnSairNav.addEventListener("click", (e) => {
    e.preventDefault();
    sair();
  });
}