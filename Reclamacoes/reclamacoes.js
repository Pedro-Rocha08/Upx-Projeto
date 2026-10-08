const seed = [
  {
    id: 1,
    title: "Ar-condicionado do bloco B",
    description: "Salas com temperatura elevada durante as aulas da tarde.",
    category: "Infraestrutura",
    location: "Bloco B • 2º andar",
    votes: 48,
    status: "Em análise",
    answered: true,
    response:
      "A equipe de manutenção foi acionada e está avaliando o equipamento.",
  },
  {
    id: 2,
    title: "Fila no restaurante universitário",
    description: "Tempo de espera muito alto no intervalo do almoço.",
    category: "Alimentação",
    location: "RU • Prédio principal",
    votes: 37,
    status: "Pendente",
    answered: false,
    response: "",
  },
  {
    id: 3,
    title: "Wi-Fi instável na biblioteca",
    description: "Conexão cai com frequência durante o período de estudos.",
    category: "Tecnologia",
    location: "Biblioteca",
    votes: 31,
    status: "Respondido",
    answered: true,
    response:
      "A infraestrutura de rede identificou um ponto com instabilidade e programou a substituição.",
  },
  {
    id: 4,
    title: "Iluminação insuficiente no estacionamento",
    description: "Algumas áreas ficam muito escuras após as 19h.",
    category: "Segurança",
    location: "Estacionamento externo",
    votes: 26,
    status: "Em análise",
    answered: true,
    response:
      "O setor responsável recebeu a demanda para vistoria dos pontos de iluminação.",
  },
  {
    id: 5,
    title: "Bebedouro sem refrigeração",
    description:
      "O bebedouro do corredor central está funcionando sem água gelada.",
    category: "Infraestrutura",
    location: "Bloco C • térreo",
    votes: 18,
    status: "Resolvido",
    answered: true,
    response:
      "Manutenção concluída. O equipamento voltou a operar normalmente.",
  },
];
function getData() {
  try {
    const d = JSON.parse(localStorage.getItem("fiscalizeComplaints"));
    if (d?.length) return d;
    localStorage.setItem("fiscalizeComplaints", JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}
function save(d) {
  localStorage.setItem("fiscalizeComplaints", JSON.stringify(d));
}
let data = getData(),
  currentFilter = "all";
const list = document.getElementById("complaintList"),
  search = document.getElementById("search"),
  count = document.getElementById("countBadge");
function statusClass(s) {
  return s === "Resolvido"
    ? "resolved"
    : s === "Pendente"
      ? "pending"
      : s === "Respondido"
        ? "answered"
        : "analysis";
}
function render() {
  const q = search.value.toLowerCase();
  let out = data
    .filter((c) => {
      const text = (
        c.title +
        " " +
        c.description +
        " " +
        c.category +
        " " +
        c.location
      ).toLowerCase();
      const matches = text.includes(q);
      const filter =
        currentFilter === "priority"
          ? c.votes >= 30
          : currentFilter === "unanswered"
            ? !c.answered
            : currentFilter === "resolved"
              ? c.status === "Resolvido"
              : true;
      return matches && filter;
    })
    .sort((a, b) => b.votes - a.votes);
  count.textContent = data.length;
  list.innerHTML = out.length
    ? out
        .map(
          (c) =>
            `<article class="complaint"><div class="vote-box"><button onclick="vote(${c.id})" aria-label="Concordo com esta reclamação">▲</button><strong>${c.votes}</strong><small>apoios</small></div><div><div class="complaint-meta"><span class="badge">${c.category}</span><span>${c.answered ? "● resposta da instituição" : "● aguardando resposta"}</span></div><h3>${c.title}</h3><p class="complaint-desc">${c.description}</p><div class="location">⌖ ${c.location}</div></div><span class="status ${statusClass(c.status)}">${c.status}</span>${c.response ? `<div class="response"><strong>Resposta da instituição:</strong> ${c.response}</div>` : ""}</article>`,
        )
        .join("")
    : '<div class="form-card" style="text-align:center"><h2>Nenhuma reclamação encontrada</h2><p class="form-intro">Tente outro filtro ou registre um novo problema.</p></div>';
}
function vote(id) {
  data = data.map((c) => (c.id === id ? { ...c, votes: c.votes + 1 } : c));
  save(data);
  render();
}
window.vote = vote;
document.querySelectorAll(".filter").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll(".filter")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    currentFilter = b.dataset.filter;
    render();
  }),
);
search.addEventListener("input", render);
const tabs = document.querySelectorAll(".tab-btn"),
  sections = document.querySelectorAll(".tab-content");
function openTab(name) {
  tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  sections.forEach((s) => s.classList.toggle("active", s.id === name));
  if (name === "registrar") history.replaceState(null, "", "#registrar");
  else history.replaceState(null, "", "#feed");
}
tabs.forEach((b) => b.addEventListener("click", () => openTab(b.dataset.tab)));
document
  .getElementById("openForm")
  .addEventListener("click", () => openTab("registrar"));
document
  .getElementById("cancelForm")
  .addEventListener("click", () => openTab("feed"));
if (location.hash === "#registrar") openTab("registrar");
const form = document.getElementById("complaintForm");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("titulo").value.trim(),
    description = document.getElementById("descricao").value.trim(),
    category = document.getElementById("categoria").value,
    locationText = document.getElementById("local").value.trim();
  data.unshift({
    id: Date.now(),
    title,
    description,
    category,
    location: locationText,
    votes: 1,
    status: "Pendente",
    answered: false,
    response: "",
  });
  save(data);
  form.reset();
  openTab("feed");
  render();
  alert("Reclamação publicada com sucesso!");
});
const menuBtn = document.getElementById("menuBtn"),
  sidebar = document.getElementById("sidebar"),
  overlay = document.getElementById("overlay"),
  closeMenu = document.getElementById("closeMenu");
function setMenu(open) {
  sidebar.classList.toggle("active", open);
  overlay.classList.toggle("active", open);
}
menuBtn.addEventListener("click", () => setMenu(true));
closeMenu.addEventListener("click", () => setMenu(false));
overlay.addEventListener("click", () => setMenu(false));
const themeBtn = document.getElementById("themeBtn");
if (localStorage.getItem("fiscalizeTheme") === "dark")
  document.documentElement.dataset.theme = "dark";
function icon() {
  themeBtn.textContent =
    document.documentElement.dataset.theme === "dark" ? "☀" : "☾";
}
icon();
themeBtn.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "" : "dark";
  localStorage.setItem("fiscalizeTheme", dark ? "light" : "dark");
  icon();
});
render();
