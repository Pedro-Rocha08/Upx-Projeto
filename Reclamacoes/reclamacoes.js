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

let currentUserId = null;

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
  console.log("DADOS ORIGINAIS DO SUPABASE:", complaints?.[0]);
  console.log(
    "COLUNAS DO PRIMEIRO REGISTRO:",
    Object.keys(complaints?.[0] || {}),
  );
  console.log("Reclamações recebidas do Supabase:", complaints);

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

  currentUserId = user?.id ?? null;
  console.log("Usuário autenticado:", currentUserId);
  console.log(
    "Reclamações e respectivos usuários:",
    data.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      tipo_user_id: typeof c.user_id,
      tipo_currentUserId: typeof currentUserId,
      corresponde: String(c.user_id) === String(currentUserId),
    })),
  );

  const myVotes = user
    ? votes
        .filter((vote) => vote.user_id === user.id)
        .map((vote) => String(vote.complaint_id))
    : [];

  localStorage.setItem("fiscalizeVotedComplaints", JSON.stringify(myVotes));

  const { data: counts, error: countsError } = await supabase.rpc(
    "get_complaint_vote_counts",
  );

  if (countsError) {
    console.error("Erro ao contar apoios:", countsError);
    return;
  }

  const voteCounts = {};

  (counts || []).forEach((row) => {
    voteCounts[row.complaint_id] = Number(row.vote_count);
  });

  const { data: media, error: mediaError } = await supabase
    .from("complaint_media")
    .select("complaint_id, file_path, file_type");

  if (mediaError) {
    console.error("Erro ao carregar mídias:", mediaError);
    return;
  }

  const mediaByComplaint = {};

  const mediaResults = await Promise.all(
    (media || []).map(async (item) => {
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("complaint-media")
          .createSignedUrl(item.file_path, 3600);

      if (signedUrlError) {
        console.error(
          "Erro ao gerar URL da mídia:",
          item.file_path,
          signedUrlError,
        );
        return null;
      }

      return {
        complaint_id: item.complaint_id,
        url: signedUrlData.signedUrl,
        type: item.file_type,
      };
    }),
  );

  for (const item of mediaResults) {
    if (!item) continue;

    if (!mediaByComplaint[item.complaint_id]) {
      mediaByComplaint[item.complaint_id] = [];
    }

    mediaByComplaint[item.complaint_id].push({
      url: item.url,
      type: item.type,
    });
  }

  data = complaints.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    votes: voteCounts[c.id] || 0,
    status: c.status,
    answered: c.answered,
    response: c.response || "",
    created_at: c.created_at,
    media_urls: (mediaByComplaint[c.id] || []).map((item) => item.url),
    media: mediaByComplaint[c.id] || [],
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
              
<div class="complaint-content">
  <div class="complaint-score">
    <strong>${calculatePriority(c)}</strong>
    <small>pontos de prioridade</small>
  </div>

  <div class="complaint-meta">
    <span class="badge">${c.category}</span>
    <span>${c.answered ? "● resposta da instituição" : "● aguardando resposta"}</span>
  </div>

  <h3>${c.title}</h3>
  <p class="complaint-desc">${c.description}</p>
  <div class="location">⌖ ${c.location}</div>

  ${
    Array.isArray(c.media_urls) && c.media_urls.length
      ? `
        <div class="complaint-media">
          ${c.media_urls
            .map((url) => {
              const item = (c.media || []).find((media) => media.url === url);
              const isVideo = item?.type === "video";

              return isVideo
                ? `<video src="${url}" controls preload="metadata"></video>`
                : `<a href="${url}" target="_blank" rel="noopener noreferrer">
                     <img src="${url}" alt="Mídia da reclamação" loading="lazy">
                   </a>`;
            })
            .join("")}
        </div>
      `
      : ""
  }

  ${
    c.response
      ? `<div class="response"><strong>Resposta da instituição:</strong> ${c.response}</div>`
      : ""
  }

  ${
    String(c.user_id) === String(currentUserId)
      ? `<div class="complaint-actions">
           <button type="button" onclick="addMediaToComplaint('${c.id}')">Adicionar mídia</button>
           <button type="button" class="delete-complaint-btn" onclick="deleteComplaint('${c.id}')">Excluir reclamação</button>
         </div>`
      : ""
  }
</div>

<span class="status ${statusClass(c.status)}">${c.status}</span>

</article>
`,
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
const mediaInput = document.getElementById("foto");
const mediaPreview = document.getElementById("mediaPreview");
const mediaMessage = document.getElementById("mediaMessage");

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let previewUrls = [];

mediaInput.addEventListener("change", () => {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  mediaPreview.replaceChildren();
  mediaMessage.textContent = "";

  const files = Array.from(mediaInput.files || []);

  if (files.length > MAX_FILES) {
    mediaMessage.textContent = "Selecione no máximo 5 arquivos.";
    mediaInput.value = "";
    return;
  }

  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      mediaMessage.textContent =
        "Formato não permitido. Selecione imagens ou vídeos.";
      mediaInput.value = "";
      mediaPreview.replaceChildren();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      mediaMessage.textContent = "Cada arquivo deve ter no máximo 10 MB.";
      mediaInput.value = "";
      mediaPreview.replaceChildren();
      return;
    }
  }

  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);

    const element = document.createElement(
      file.type.startsWith("image/") ? "img" : "video",
    );

    element.src = url;
    element.alt = file.name;

    if (file.type.startsWith("video/")) {
      element.controls = true;
    }

    mediaPreview.appendChild(element);
  });
});

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

  // Envia as mídias selecionadas e registra seus caminhos no banco.
  const files = Array.from(mediaInput.files || []);
  const uploadedMedia = [];

  for (const originalFile of files) {
    let file;

    try {
      file = await compressImage(originalFile);
    } catch (error) {
      console.error("Erro ao comprimir imagem:", error);
      file = originalFile;
    }

    const filePath = `${sessionData.session.user.id}/${newComplaint.id}/${crypto.randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("complaint-media")
      .upload(filePath, file);
    if (uploadError) {
      console.error("Erro ao enviar mídia:", uploadError);
      alert(
        "A reclamação foi criada, mas uma mídia não pôde ser enviada. Confira o Console.",
      );
      return;
    }

    uploadedMedia.push({
      complaint_id: newComplaint.id,
      user_id: sessionData.session.user.id,
      file_path: filePath,
      file_type: file.type.startsWith("image/") ? "image" : "video",
    });
  }

  if (uploadedMedia.length > 0) {
    const { error: mediaError } = await supabase
      .from("complaint_media")
      .insert(uploadedMedia);

    if (mediaError) {
      console.error("Erro ao registrar mídias:", mediaError);
      console.error("Código:", mediaError.code);
      console.error(
        "Detalhes:",
        mediaError.message,
        mediaError.details,
        mediaError.hint,
      );
      alert(
        "A reclamação foi criada, mas não foi possível registrar as mídias. Confira o Console.",
      );
      return;
    }
  }

  form.reset();

  mediaPreview.replaceChildren();
  mediaMessage.textContent = "";

  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];

  // Recarrega a reclamação e suas mídias diretamente do Supabase.
  await loadComplaintsFromSupabase();

  openTab("feed");

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

async function deleteComplaint(complaintId) {
  if (!currentUserId) {
    alert("Você precisa estar logado para excluir uma reclamação.");
    return;
  }

  const complaint = data.find(
    (item) => String(item.id) === String(complaintId),
  );

  if (!complaint || complaint.user_id !== currentUserId) {
    alert("Você só pode excluir suas próprias reclamações.");
    return;
  }

  const confirmed = confirm(
    "Tem certeza de que deseja excluir esta reclamação e todas as mídias anexadas? Essa ação não pode ser desfeita.",
  );

  if (!confirmed) return;

  const { data: media, error: mediaError } = await window.supabaseClient
    .from("complaint_media")
    .select("file_path")
    .eq("complaint_id", complaintId)
    .eq("user_id", currentUserId);

  if (mediaError) {
    console.error("Erro ao buscar mídias:", mediaError);
    alert("Não foi possível consultar as mídias da reclamação.");
    return;
  }

  const paths = (media || []).map((item) => item.file_path);

  if (paths.length > 0) {
    const { error: storageError } = await window.supabaseClient.storage
      .from("complaint-media")
      .remove(paths);

    if (storageError) {
      console.error("Erro ao excluir mídias do Storage:", storageError);
      alert("Não foi possível excluir as mídias. A reclamação foi mantida.");
      return;
    }
  }

  const { error: deleteError } = await window.supabaseClient
    .from("complaints")
    .delete()
    .eq("id", complaintId)
    .eq("user_id", currentUserId);

  if (deleteError) {
    console.error("Erro ao excluir reclamação:", deleteError);
    alert("Não foi possível excluir a reclamação.");
    return;
  }

  await loadComplaintsFromSupabase();

  if (typeof window.showToast === "function") {
    window.showToast("Reclamação excluída com sucesso!", "success");
  } else {
    alert("Reclamação excluída com sucesso!");
  }
}

window.deleteComplaint = deleteComplaint;

async function compressImage(file) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // GIFs e formatos que o navegador não consegue decodificar
  // são mantidos sem conversão.
  if (file.type === "image/gif") {
    return file;
  }

  try {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = new Image();

      image.src = imageUrl;

      await image.decode();

      const maxDimension = 1600;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Não foi possível comprimir a imagem."));
          },
          "image/jpeg",
          0.82,
        );
      });

      // Só usa a versão comprimida se ela realmente ficar menor.
      if (blob.size >= file.size) {
        return file;
      }

      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  } catch (error) {
    console.warn("Não foi possível comprimir a imagem:", error);
    return file;
  }
}

async function addMediaToComplaint(complaintId) {
  if (!currentUserId) {
    alert("Você precisa estar conectado para adicionar mídia.");
    return;
  }

  const complaint = data.find(
    (item) => String(item.id) === String(complaintId),
  );

  if (!complaint || String(complaint.user_id) !== String(currentUserId)) {
    alert("Você só pode adicionar mídia às suas próprias reclamações.");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/mp4,video/webm,video/quicktime";
  input.multiple = true;

  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);

    if (!files.length) return;

    if (files.length > 5) {
      alert("Selecione no máximo 5 arquivos por vez.");
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        alert("Selecione apenas imagens ou vídeos.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" ultrapassa o limite de 10 MB.`);
        return;
      }
    }

    const uploadedPaths = [];
    const mediaRows = [];

    try {
      for (const originalFile of files) {
        const file = await compressImage(originalFile);

        const filePath = `${currentUserId}/${complaintId}/${crypto.randomUUID()}-${file.name}`;

        const { error: uploadError } = await window.supabaseClient.storage
          .from("complaint-media")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedPaths.push(filePath);

        mediaRows.push({
          complaint_id: complaintId,
          user_id: currentUserId,
          file_path: filePath,
          file_type: file.type.startsWith("video/") ? "video" : "image",
        });
      }

      const { error: insertError } = await window.supabaseClient
        .from("complaint_media")
        .insert(mediaRows);

      if (insertError) throw insertError;

      alert("Mídia adicionada com sucesso!");

      await loadComplaintsFromSupabase();
    } catch (error) {
      console.error("Erro ao adicionar mídia:", error);

      if (uploadedPaths.length) {
        const { error: cleanupError } = await window.supabaseClient.storage
          .from("complaint-media")
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error("Erro ao limpar arquivos enviados:", cleanupError);
        }
      }

      alert(
        "Não foi possível adicionar a mídia. Confira o console para ver o erro.",
      );
    }
  });

  input.click();
}
