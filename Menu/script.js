const seed = [
  {
    id: 1,
    title: "Ar-condicionado do bloco B",
    description: "Salas com temperatura elevada durante as aulas da manhã.",
    category: "Infraestrutura",
    location: "Bloco B • 2º andar",
    votes: 48,
    status: "Em análise",
    answered: true,
  },
  {
    id: 2,
    title: "Fila no estacionamento",
    description: "Tempo de espera muito alto para entrar e sair do campus.",
    category: "Infraestrutura",
    location: "Vias do Campus",
    votes: 37,
    status: "Pendente",
    answered: false,
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
  },
];
function getComplaints() {
  try {
    return JSON.parse(localStorage.getItem("fiscalizeComplaints")) || seed;
  } catch {
    return seed;
  }
}
function renderHome() {
  const box = document.getElementById("homeComplaints");
  if (!box) return;
  const data = getComplaints()
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3);
  box.innerHTML = data
    .map(
      (c) =>
        `<a class="preview-card" href="../Reclamacoes/reclamacoes.html"><div class="mini-top"><span>${c.category}</span><span class="mini-votes">▲ ${c.votes}</span></div><h3>${c.title}</h3><p>${c.description}</p><span class="mini-status">${c.status}</span></a>`,
    )
    .join("");
  document.getElementById("statOpen").textContent =
    getComplaints().filter((c) => c.status !== "Resolvido").length + 9;
  document.getElementById("statAnswered").textContent =
    getComplaints().filter((c) => c.answered).length + 4;
}
const menuBtn = document.getElementById("menuBtn"),
  sidebar = document.getElementById("sidebar"),
  overlay = document.getElementById("overlay"),
  closeMenu = document.getElementById("closeMenu");
function setMenu(open) {
  sidebar.classList.toggle("active", open);
  overlay.classList.toggle("active", open);
  menuBtn?.setAttribute("aria-expanded", String(open));
}
menuBtn?.addEventListener("click", () => setMenu(true));
closeMenu?.addEventListener("click", () => setMenu(false));
overlay?.addEventListener("click", () => setMenu(false));
const themeBtn = document.getElementById("themeBtn");
const saved = localStorage.getItem("fiscalizeTheme");
function updateLogo() {
  const logo = document.querySelector(".brand-link img");

  if (!logo) return;

  const dark = document.documentElement.dataset.theme === "dark";

  logo.src = dark ? "assets/logo-nightmode.png" : "assets/logo.png";
}
if (saved === "dark") document.documentElement.dataset.theme = "dark";
updateLogo();
function updateThemeIcon() {
  themeBtn.textContent =
    document.documentElement.dataset.theme === "dark" ? "☀" : "☾";
}
updateThemeIcon();
themeBtn?.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "" : "dark";
  localStorage.setItem("fiscalizeTheme", dark ? "light" : "dark");
  updateThemeIcon();
  updateLogo();
});
renderHome();
