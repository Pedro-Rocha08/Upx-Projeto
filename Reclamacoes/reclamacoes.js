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
    title: "Fila no estacionamento",
    description: "Tempo de espera muito alto para entrar e sair do campus.",
    category: "Infraestrutura",
    location: "Vias do Campus",
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
function calculatePriority(complaint) {
  const votes = Math.max(0, Number(complaint.votes) || 0);

  const createdAt = new Date(complaint.created_at || Date.now()).getTime();

  const ageInDays = Number.isFinite(createdAt)
    ? Math.max(0, (Date.now() - createdAt) / 86400000)
    : 0;

  // Apoios: pontuação com limite para evitar que números
  // muito altos dominem completamente o ranking.
  const supportScore = Math.min(100, votes * 2);

  // Tempo: aumenta gradualmente, até atingir 100 pontos.
  const timeScore = Math.min(100, ageInDays * 5);

  // Prioridade provisória: 80% apoios e 20% tempo.
  return Math.round(supportScore * 0.8 + timeScore * 0.2);
}
let data = getData(),
  currentFilter = "all";
const list = document.getElementById("complaintList"),
  search = document.getElementById("search"),
  count = document.getElementById("countBadge");

async function loadComplaintsFromSupabase() {
  const supabase = window.supabaseClient;

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar reclamações:", error);
    return;
  }

  const { data: votes, error: votesError } = await supabase
    .from("complaint_votes")
    .select("complaint_id, user_id");

  if (votesError) {
    console.error("Erro ao carregar apoios:", votesError);
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Erro ao identificar usuário:", userError);
  }

  const myVotes = user
    ? votes
        .filter((vote) => vote.user_id === user.id)
        .map((vote) => String(vote.complaint_id))
    : [];

  localStorage.setItem("fiscalizeVotedComplaints", JSON.stringify(myVotes));

  const voteCounts = {};

  votes.forEach((vote) => {
    const complaintId = vote.complaint_id;
    voteCounts[complaintId] = (voteCounts[complaintId] || 0) + 1;
  });

  data = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    votes: voteCounts[c.id] || 0,
    status: c.status,
    answered: c.answered,
    response: c.response || "",
    created_at: c.created_at,
  }));

  render();
}

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
          ? calculatePriority(c) >= 60
          : currentFilter === "unanswered"
            ? !c.answered
            : currentFilter === "resolved"
              ? c.status === "Resolvido"
              : true;
      return matches && filter;
    })
    .sort((a, b) => calculatePriority(b) - calculatePriority(a));
  count.textContent = data.length;
  list.innerHTML = out.length
    ? out
        .map(
          (c) =>
            `<article class="complaint">
              <div class="vote-box">
                <button
                  type="button"
                  onclick="vote('${c.id}')"
                  class="${getVotedComplaints().includes(String(c.id)) ? "voted" : ""}"
                  aria-label="${getVotedComplaints().includes(String(c.id)) ? "Retirar meu apoio" : "Apoiar esta reclamação"}"
                  aria-pressed="${getVotedComplaints().includes(String(c.id))}"
                  title="${getVotedComplaints().includes(String(c.id)) ? "Você já apoiou esta reclamação" : "Apoiar esta reclamação"}"
                >▲</button>
                <strong>${c.votes}</strong>
                <small>apoios</small>
              </div>
              <div class="complaint-score"><strong>${calculatePriority(c)}</strong><small>pontos de prioridade</small></div><div><div class="complaint-meta"><span class="badge">${c.category}</span><span>${c.answered ? "● resposta da instituição" : "● aguardando resposta"}</span></div><h3>${c.title}</h3><p class="complaint-desc">${c.description}</p><div class="location">⌖ ${c.location}</div></div><span class="status ${statusClass(c.status)}">${c.status}</span>${c.response ? `<div class="response"><strong>Resposta da instituição:</strong> ${c.response}</div>` : ""}</article>`,
        )
        .join("")
    : '<div class="form-card" style="text-align:center"><h2>Nenhuma reclamação encontrada</h2><p class="form-intro">Tente outro filtro ou registre um novo problema.</p></div>';
}

function getVotedComplaints() {
  try {
    const voted = JSON.parse(localStorage.getItem("fiscalizeVotedComplaints"));

    return Array.isArray(voted) ? voted : [];
  } catch {
    return [];
  }
}

function showWithdrawSupportModal(id) {
  document.getElementById("support-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "support-modal";
  modal.className = "support-modal-overlay";

  modal.innerHTML = `
    <div class="support-modal" role="dialog"
         aria-modal="true"
         aria-labelledby="support-modal-title">
      <div class="support-modal-icon">↑</div>

      <h3 id="support-modal-title">Apoio registrado</h3>

      <p>
        Você já deu seu apoio nesta reclamação.
        Gostaria de retirar seu apoio?
      </p>

      <div class="support-modal-actions">
        <button type="button" class="support-cancel">
          Manter apoio
        </button>

        <button type="button" class="support-remove">
          Retirar apoio
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  function closeModal() {
    modal.remove();
  }

  modal.querySelector(".support-cancel").addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  modal.querySelector(".support-remove").addEventListener("click", async () => {
    const supabase = window.supabaseClient;

    if (!supabase) {
      alert("Não foi possível conectar ao banco de dados.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Entre na sua conta para retirar seu apoio.");
      return;
    }

    const { error } = await supabase
      .from("complaint_votes")
      .delete()
      .eq("complaint_id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao retirar apoio:", error);
      alert("Não foi possível retirar seu apoio. Tente novamente.");
      return;
    }

    const votedComplaints = getVotedComplaints().filter(
      (votedId) => votedId !== String(id),
    );

    localStorage.setItem(
      "fiscalizeVotedComplaints",
      JSON.stringify(votedComplaints),
    );

    closeModal();
    await loadComplaintsFromSupabase();
  });
}

async function vote(id) {
  const supabase = window.supabaseClient;

  if (!supabase) {
    alert("Não foi possível conectar ao banco de dados.");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("Entre na sua conta para apoiar uma reclamação.");
    return;
  }

  const { data: existingVote, error: checkError } = await supabase
    .from("complaint_votes")
    .select("complaint_id")
    .eq("complaint_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) {
    console.error("Erro ao verificar apoio:", checkError);
    alert("Não foi possível verificar seu apoio. Tente novamente.");
    return;
  }

  if (existingVote) {
    showWithdrawSupportModal(id);
    return;
  }

  const { error: insertError } = await supabase.from("complaint_votes").insert({
    complaint_id: id,
    user_id: user.id,
  });

  if (insertError) {
    console.error("Erro ao registrar apoio:", insertError);
    alert("Não foi possível registrar seu apoio. Tente novamente.");
    return;
  }

  const votedComplaints = getVotedComplaints();

  if (!votedComplaints.includes(String(id))) {
    votedComplaints.push(String(id));

    localStorage.setItem(
      "fiscalizeVotedComplaints",
      JSON.stringify(votedComplaints),
    );
  }

  await loadComplaintsFromSupabase();
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("titulo").value.trim();
  const description = document.getElementById("descricao").value.trim();
  const category = document.getElementById("categoria").value;
  const locationText = document.getElementById("local").value.trim();

  const supabase = window.supabaseClient;

  if (!supabase) {
    alert("Não foi possível conectar ao banco de dados.");
    return;
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    alert("Entre na sua conta para publicar uma reclamação.");
    return;
  }

  const { data: newComplaint, error } = await supabase
    .from("complaints")
    .insert({
      user_id: sessionData.session.user.id,
      title,
      description,
      category,
      location: locationText,
      status: "Pendente",
      answered: false,
      response: "",
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao publicar reclamação:", error);
    alert("Não foi possível publicar. Confira o Console para ver o erro.");
    return;
  }

  data.unshift({
    id: newComplaint.id,
    title: newComplaint.title,
    description: newComplaint.description,
    category: newComplaint.category,
    location: newComplaint.location,
    votes: newComplaint.votes ?? 0,
    status: newComplaint.status,
    answered: newComplaint.answered,
    response: newComplaint.response,
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
function updateLogo() {
  const logo = document.querySelector(".brand-link img");

  if (!logo) return;

  const dark = document.documentElement.dataset.theme === "dark";

  logo.src = dark
    ? "../Menu/assets/logo-nightmode.png"
    : "../Menu/assets/logo.png";
}
if (localStorage.getItem("fiscalizeTheme") === "dark")
  document.documentElement.dataset.theme = "dark";
updateLogo();
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
  updateLogo();
});
render();

loadComplaintsFromSupabase();
