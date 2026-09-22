let rawSessionsData = [];
let refreshTimer = null;
let audioCtx = null;

function playAlertSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.log("Audio not allowed yet:", e);
  }
}

async function detectActiveTabEventCode() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      
      // 1. Cek query parameter: ?code=EX5B99
      const codeParam = url.searchParams.get("code");
      if (codeParam) {
        document.getElementById("event-code").value = codeParam.trim().toUpperCase();
        return;
      }

      // 2. Cek path URL: /exclusives/EX5B99 atau /exclusive/EX5B99
      const match = tab.url.match(/exclusives?\/([A-Za-z0-9]+)/i);
      if (match && match[1]) {
        document.getElementById("event-code").value = match[1].toUpperCase();
      }
    }
  } catch (e) {
    console.error("Tab detection error:", e);
  }
}

async function fetchQuota() {
  const eventCode = document.getElementById("event-code").value.trim();
  const statusBadge = document.getElementById("login-status");
  const container = document.getElementById("quota-container");

  if (!eventCode) {
    alert("Masukkan kode event terlebih dahulu.");
    return;
  }

  statusBadge.className = "badge badge-info";
  statusBadge.textContent = "Fetching...";

  try {
    const res = await fetch(`https://jkt48.com/api/v1/exclusives/${eventCode}/bonus?lang=id`, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
      },
      credentials: "include"
    });

    if (res.status === 403) {
      statusBadge.className = "badge badge-danger";
      statusBadge.textContent = "Belum Login / Cloudflare Block";
      container.innerHTML = `<div class="placeholder-msg">Akses ditolak (403). Pastikan sudah login di tab <a href="https://jkt48.com" target="_blank">jkt48.com</a>.</div>`;
      return;
    }

    if (res.status === 304 && rawSessionsData.length > 0) {
      statusBadge.className = "badge badge-success";
      statusBadge.textContent = "Aktif (304 Unchanged)";
      renderData();
      return;
    }

    const data = await res.json();
    if (data && data.status && Array.isArray(data.data)) {
      rawSessionsData = data.data;
      statusBadge.className = "badge badge-success";
      statusBadge.textContent = "Login Aktif";
      renderData();
    } else {
      statusBadge.className = "badge badge-danger";
      statusBadge.textContent = "Format Salah";
      container.innerHTML = `<div class="placeholder-msg">${data.message || "Data sesi tidak ditemukan."}</div>`;
    }
  } catch (err) {
    statusBadge.className = "badge badge-danger";
    statusBadge.textContent = "Koneksi Error";
    container.innerHTML = `<div class="placeholder-msg">Gagal menghubungi server JKT48: ${err.message}</div>`;
  }
}

function renderData() {
  const container = document.getElementById("quota-container");
  const search = document.getElementById("search-member").value.toLowerCase().trim();
  const availableOnly = document.getElementById("filter-available").checked;
  const statTotal = document.getElementById("stat-total-available");
  const lastUpdated = document.getElementById("last-updated");

  let totalAvailable = 0;
  let html = "";
  let hasFoundQuota = false;

  for (const session of rawSessionsData) {
    const sessionName = session.label || "Sesi";
    const date = session.date || "";
    const timeRange = `${(session.start_time || "").substring(0, 5)} - ${(session.end_time || "").substring(0, 5)}`;
    const members = session.session_members || [];

    const filtered = members.filter(m => {
      const matchName = !search || (m.member_name && m.member_name.toLowerCase().includes(search));
      const matchAvail = !availableOnly || (m.available_quota > 0);
      return matchName && matchAvail;
    });

    if (filtered.length === 0) continue;

    html += `
      <div class="session-card">
        <div class="session-header">
          <span>${sessionName} (${date})</span>
          <span>${timeRange}</span>
        </div>
        <div class="member-list">
    `;

    for (const m of filtered) {
      const quota = m.available_quota || 0;
      const isAvailable = quota > 0;
      if (isAvailable) {
        totalAvailable++;
        hasFoundQuota = true;
      }

      html += `
        <div class="member-row">
          <div class="member-info">
            <span class="member-name">${m.member_name}</span>
            <span class="member-detail">${m.label} &bull; Rp${(m.price || 0).toLocaleString("id-ID")}</span>
          </div>
          <span class="quota-pill ${isAvailable ? "quota-available" : "quota-soldout"}">
            ${isAvailable ? `Tersedia: ${quota}` : "Habis"}
          </span>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  statTotal.textContent = totalAvailable;
  lastUpdated.textContent = new Date().toLocaleTimeString("id-ID");

  if (!html) {
    container.innerHTML = `<div class="placeholder-msg">Tidak ada kuota yang cocok dengan pencarian / filter.</div>`;
  } else {
    container.innerHTML = html;
  }

  if (hasFoundQuota && document.getElementById("auto-refresh").checked) {
    playAlertSound();
  }
}

function handleAutoRefresh() {
  const isEnabled = document.getElementById("auto-refresh").checked;
  const intervalSeconds = parseInt(document.getElementById("refresh-interval").value, 10) || 5;

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (isEnabled) {
    refreshTimer = setInterval(() => {
      fetchQuota();
    }, intervalSeconds * 1000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  detectActiveTabEventCode();

  document.getElementById("btn-fetch").addEventListener("click", () => {
    fetchQuota();
  });

  document.getElementById("search-member").addEventListener("input", renderData);
  document.getElementById("filter-available").addEventListener("change", renderData);
  document.getElementById("auto-refresh").addEventListener("change", handleAutoRefresh);
  document.getElementById("refresh-interval").addEventListener("change", handleAutoRefresh);

  // Help modal handlers
  const helpModal = document.getElementById("help-modal");
  document.getElementById("btn-help").addEventListener("click", () => {
    helpModal.classList.remove("hidden");
  });
  document.getElementById("btn-close-help").addEventListener("click", () => {
    helpModal.classList.add("hidden");
  });
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) {
      helpModal.classList.add("hidden");
    }
  });

  // Auto fetch immediately
  fetchQuota();
});
