// ── DOM Refs ──────────────────────────────────────────
const keywordInput = document.getElementById("keyword-input");
const regionSelect = document.getElementById("region-select");
const durationSelect = document.getElementById("duration-select");
const analyzeBtn = document.getElementById("analyze-btn");
const loader = document.getElementById("loader");
const errorBanner = document.getElementById("error");
const statsPage = document.getElementById("stats-page");

// ── Helpers ───────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function parseDuration(iso) {
  if (!iso) return "0:00";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "0:00";
  const h = m[1] ? `${m[1]}:` : "";
  const min = m[2] || "0";
  const sec = (m[3] || "0").padStart(2, "0");
  return h ? `${h}${min.padStart(2, "0")}:${sec}` : `${min}:${sec}`;
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

// ── Fetch & Render Stats ──────────────────────────────
async function fetchStats() {
  const keyword = keywordInput.value.trim();
  const region = regionSelect.value;
  const duration = durationSelect.value;

  showError(null);
  showLoader(true);
  statsPage.style.display = "none";
  analyzeBtn.classList.add("loading");

  try {
    let url = `/api/stats?region=${region}&maxResults=50&duration=${duration}`;
    if (keyword) {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Request failed");

    renderOverview(data.totals);
    renderTags(data.tags);
    renderCategories(data.categories);
    renderChannels(data.channels);
    renderTopVideos(data.topVideos);

    statsPage.style.display = "block";
  } catch (err) {
    showError(err.message);
  } finally {
    showLoader(false);
    analyzeBtn.classList.remove("loading");
  }
}

// ── Render Functions ──────────────────────────────────
function renderOverview(totals) {
  document.getElementById("ov-videos").textContent = totals.videos || 0;
  document.getElementById("ov-views").textContent = formatNumber(totals.views || 0);
  document.getElementById("ov-likes").textContent = formatNumber(totals.likes || 0);
  document.getElementById("ov-comments").textContent = formatNumber(totals.comments || 0);
}

function renderTags(tags) {
  const container = document.getElementById("tags-list");

  if (!tags || tags.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🏷️</div>
        <p>No tags found for this search</p>
      </div>`;
    return;
  }

  container.innerHTML = tags
    .map(
      (t, i) => `
    <span class="tag-pill ${i < 3 ? "tag-pill--top" : ""}">
      #${t.tag}
      <span class="tag-pill__count">${t.count}</span>
    </span>`
    )
    .join("");
}

function renderCategories(categories) {
  const container = document.getElementById("categories-list");

  if (!categories || categories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📁</div>
        <p>No category data available</p>
      </div>`;
    return;
  }

  const maxCount = categories[0]?.count || 1;

  container.innerHTML = categories
    .map(
      (c, i) => `
    <div class="bar-item">
      <span class="bar-item__rank">${i + 1}</span>
      <span class="bar-item__label">${c.name}</span>
      <div class="bar-item__track">
        <div class="bar-item__fill" style="width: ${(c.count / maxCount) * 100}%"></div>
      </div>
      <span class="bar-item__value">${c.count} videos</span>
    </div>`
    )
    .join("");
}

function renderChannels(channels) {
  const container = document.getElementById("channels-list");

  if (!channels || channels.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📺</div>
        <p>No channel data available</p>
      </div>`;
    return;
  }

  container.innerHTML = channels
    .map(
      (ch, i) => `
    <div class="channel-card">
      <span class="channel-card__rank">#${i + 1}</span>
      <div class="channel-card__info">
        <div class="channel-card__name">${ch.name}</div>
        <div class="channel-card__meta">${ch.videos} trending video${ch.videos > 1 ? "s" : ""}</div>
      </div>
      <span class="channel-card__views">${formatNumber(ch.views)} views</span>
    </div>`
    )
    .join("");
}

function renderTopVideos(videos) {
  const container = document.getElementById("videos-table");

  if (!videos || videos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔥</div>
        <p>No videos to display</p>
      </div>`;
    return;
  }

  const rows = videos
    .map(
      (v, i) => `
    <tr>
      <td class="vtable__rank">${i + 1}</td>
      <td><img class="vtable__thumb" src="${v.thumbnail}" alt="" loading="lazy" /></td>
      <td>
        <div class="vtable__title" title="${v.title.replace(/"/g, "&quot;")}">${v.title}</div>
        <div class="vtable__channel">${v.channel}</div>
      </td>
      <td class="vtable__number">${formatNumber(v.views)}</td>
      <td class="vtable__number">${formatNumber(v.likes)}</td>
      <td class="vtable__number">${formatNumber(v.comments)}</td>
      <td class="vtable__number">${parseDuration(v.duration)}</td>
    </tr>`
    )
    .join("");

  container.innerHTML = `
    <table class="vtable">
      <thead>
        <tr>
          <th>#</th>
          <th></th>
          <th>Title</th>
          <th style="text-align:right">Views</th>
          <th style="text-align:right">Likes</th>
          <th style="text-align:right">Comments</th>
          <th style="text-align:right">Duration</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Event Listeners ───────────────────────────────────
analyzeBtn.addEventListener("click", fetchStats);

keywordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") fetchStats();
});

// ── Init ──────────────────────────────────────────────
fetchStats();
