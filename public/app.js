// ── DOM Refs ──────────────────────────────────────────
const regionSelect = document.getElementById("region-select");
const categorySelect = document.getElementById("category-select");
const countSelect = document.getElementById("count-select");
const keywordInput = document.getElementById("keyword-input");
const refreshBtn = document.getElementById("refresh-btn");
const videoGrid = document.getElementById("video-grid");
const loader = document.getElementById("loader");
const errorBanner = document.getElementById("error");
const statsBar = document.getElementById("stats-bar");
const modalOverlay = document.getElementById("modal-overlay");
const modalPlayer = document.getElementById("modal-player");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// ── Helpers ───────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "0:00";
  const h = m[1] ? `${m[1]}:` : "";
  const min = m[2] || "0";
  const sec = (m[3] || "0").padStart(2, "0");
  return h ? `${h}${min.padStart(2, "0")}:${sec}` : `${min}:${sec}`;
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const units = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [s, label] of units) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function showLoader(show) {
  loader.style.display = show ? "block" : "none";
}

function showError(msg) {
  if (msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = "block";
  } else {
    errorBanner.style.display = "none";
  }
}

// ── SVG Icon helpers ──────────────────────────────────
const icons = {
  views: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  likes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
  comments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
};

// ── Fetch categories ──────────────────────────────────
async function loadCategories() {
  const region = regionSelect.value;
  try {
    const res = await fetch(`/api/categories?region=${region}`);
    const data = await res.json();
    if (!res.ok) return;

    // Preserve current selection if possible
    const current = categorySelect.value;
    categorySelect.innerHTML = `<option value="0">All Categories</option>`;
    (data.categories || []).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.title;
      categorySelect.appendChild(opt);
    });
    categorySelect.value = current;
    if (!categorySelect.value) categorySelect.value = "0";
  } catch {
    // silently fail; categories are optional
  }
}

// ── Fetch & render trending ───────────────────────────
let currentVideos = [];

async function fetchTrending() {
  const region = regionSelect.value;
  const category = categorySelect.value;
  const maxResults = countSelect.value;
  const keyword = keywordInput.value.trim();

  videoGrid.innerHTML = "";
  showError(null);
  showLoader(true);
  statsBar.style.display = "none";
  refreshBtn.classList.add("loading");

  try {
    let url = `/api/trending?region=${region}&category=${category}&maxResults=${maxResults}`;
    if (keyword) {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Request failed");
    if (!data.videos?.length) {
      const msg = keyword 
        ? `No videos found for "${keyword}". Try different keywords.`
        : "No trending videos found for this region/category.";
      throw new Error(msg);
    }

    currentVideos = data.videos;
    renderGrid(currentVideos);
    renderStats(currentVideos);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoader(false);
    refreshBtn.classList.remove("loading");
  }
}

function renderGrid(videos) {
  videoGrid.innerHTML = videos
    .map(
      (v, i) => `
    <article class="card" data-index="${i}">
      <div class="card__thumb-wrapper">
        <img class="card__thumb" src="${v.thumbnail}" alt="${escapeHtml(v.title)}" loading="lazy" />
        <span class="card__duration">${parseDuration(v.duration)}</span>
        <span class="card__rank">#${i + 1}</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(v.title)}</h3>
        <p class="card__channel">${escapeHtml(v.channel)} · ${timeAgo(v.publishedAt)}</p>
        <div class="card__meta">
          <span class="card__meta-item">${icons.views} ${formatNumber(v.views)}</span>
          <span class="card__meta-item">${icons.likes} ${formatNumber(v.likes)}</span>
          <span class="card__meta-item">${icons.comments} ${formatNumber(v.comments)}</span>
        </div>
      </div>
    </article>`
    )
    .join("");
}

function renderStats(videos) {
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = videos.reduce((s, v) => s + v.comments, 0);

  document.getElementById("stat-count").textContent = videos.length;
  document.getElementById("stat-views").textContent = formatNumber(totalViews);
  document.getElementById("stat-likes").textContent = formatNumber(totalLikes);
  document.getElementById("stat-comments").textContent = formatNumber(totalComments);
  statsBar.style.display = "block";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Modal ─────────────────────────────────────────────
function openModal(video) {
  modalPlayer.innerHTML = `<iframe 
    src="https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen></iframe>`;

  const tagsHtml =
    video.tags.length > 0
      ? `<div class="modal__tags">${video.tags
          .slice(0, 15)
          .map((t) => `<span class="modal__tag">#${escapeHtml(t)}</span>`)
          .join("")}</div>`
      : "";

  modalBody.innerHTML = `
    <h2 class="modal__title">${escapeHtml(video.title)}</h2>
    <p class="modal__channel">${escapeHtml(video.channel)} · ${timeAgo(video.publishedAt)}</p>
    <div class="modal__stats">
      <span class="modal__stat"><strong>${formatNumber(video.views)}</strong> views</span>
      <span class="modal__stat"><strong>${formatNumber(video.likes)}</strong> likes</span>
      <span class="modal__stat"><strong>${formatNumber(video.comments)}</strong> comments</span>
    </div>
    <p class="modal__description">${escapeHtml(video.description)}</p>
    ${tagsHtml}
  `;

  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.style.display = "none";
  modalPlayer.innerHTML = "";
  document.body.style.overflow = "";
}

// ── Event Listeners ───────────────────────────────────
videoGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const video = currentVideos[card.dataset.index];
  if (video) openModal(video);
});

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

refreshBtn.addEventListener("click", fetchTrending);

// Trigger search on Enter key in keyword input
keywordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") fetchTrending();
});

regionSelect.addEventListener("change", () => {
  loadCategories();
  fetchTrending();
});

categorySelect.addEventListener("change", fetchTrending);
countSelect.addEventListener("change", fetchTrending);

// ── Init ──────────────────────────────────────────────
loadCategories();
fetchTrending();
