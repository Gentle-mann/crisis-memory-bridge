const API = "";
let replayTimer = null;
let replayIndex = 0;
let replayMessages = [];
let replayPlaying = false;

// ── Load Dashboard ──
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/api/callers/summary`);
    const data = await res.json();
    renderCallerGrid(data.callers);
  } catch (err) {
    document.getElementById("caller-grid").innerHTML =
      `<div class="sup-loading">Error loading: ${err.message}</div>`;
  }
}

function renderCallerGrid(callers) {
  const grid = document.getElementById("caller-grid");
  if (!callers || callers.length === 0) {
    grid.innerHTML = `<div class="sup-loading">No callers yet. Start a session from the <a href="/">volunteer view</a>.</div>`;
    return;
  }

  let html = "";
  callers.forEach((c) => {
    const risk = c.risk_level || "unknown";
    const dateStr = c.last_date ? formatDate(c.last_date) : "";
    const escalationBadge = c.escalations
      ? `<span class="sup-escalation-badge">ESCALATED</span>`
      : "";

    html += `
      <div class="caller-card risk-border-${risk}" onclick="selectCaller('${escapeAttr(c.caller_id)}')">
        <div class="caller-card-header">
          <span class="caller-card-id">${escapeHtml(c.caller_id)}</span>
          <span class="risk-badge risk-${risk}">${risk}</span>
        </div>
        <div class="caller-card-meta">
          ${c.total_sessions} session(s) &middot; ${escapeHtml(c.last_volunteer)}
          ${escalationBadge}
        </div>
        <div class="caller-card-date">${dateStr}</div>
        <div class="caller-card-summary">${escapeHtml(truncate(c.last_summary, 120))}</div>
      </div>`;
  });
  grid.innerHTML = html;
}

// ── Select Caller ──
async function selectCaller(callerId) {
  document.getElementById("detail-panel").style.display = "block";
  document.getElementById("detail-caller-id").textContent = callerId;
  document.getElementById("replay-section").style.display = "none";

  // Load analytics and timeline in parallel
  loadAnalytics(callerId);
  loadDetailTimeline(callerId);
}

function closeDetail() {
  document.getElementById("detail-panel").style.display = "none";
  stopReplay();
}

// ── Analytics Charts ──
async function loadAnalytics(callerId) {
  try {
    const res = await fetch(`${API}/api/callers/${encodeURIComponent(callerId)}/analytics`);
    const data = await res.json();
    renderRiskChart(data.risk_trend);
    renderTriggerChart(data.trigger_counts);
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

function renderRiskChart(trend) {
  const container = document.getElementById("risk-chart");
  if (!trend || trend.length === 0) {
    container.innerHTML = "<div class='chart-empty'>No data</div>";
    return;
  }

  const w = 300, h = 80, pad = 20;
  const maxVal = 3;
  const stepX = trend.length > 1 ? (w - pad * 2) / (trend.length - 1) : 0;
  const riskColors = { 1: "#4fc78e", 2: "#e5a84f", 3: "#e55c5c", 0: "#8b8fa3" };

  let points = "";
  let dots = "";
  trend.forEach((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((d.risk_value / maxVal) * (h - pad * 2));
    points += `${x},${y} `;
    dots += `<circle cx="${x}" cy="${y}" r="4" fill="${riskColors[d.risk_value] || '#8b8fa3'}"/>`;
    dots += `<text x="${x}" y="${h - 2}" text-anchor="middle" fill="#8b8fa3" font-size="9">S${d.session}</text>`;
  });

  const labels = [
    { y: h - pad, label: "low" },
    { y: h - pad - ((2 / maxVal) * (h - pad * 2)), label: "mod" },
    { y: h - pad - ((3 / maxVal) * (h - pad * 2)), label: "high" },
  ];
  let labelsSvg = labels.map(
    (l) => `<text x="2" y="${l.y + 3}" fill="#8b8fa3" font-size="8">${l.label}</text>`
  ).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg">
      ${labelsSvg}
      <polyline points="${points.trim()}" fill="none" stroke="#4f8ff7" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
}

function renderTriggerChart(counts) {
  const container = document.getElementById("trigger-chart");
  if (!counts || counts.length === 0) {
    container.innerHTML = "<div class='chart-empty'>No data</div>";
    return;
  }

  const w = 300, h = 60, pad = 20;
  const maxCount = Math.max(...counts.map((c) => c.count), 1);
  const barW = Math.min(30, (w - pad * 2) / counts.length - 4);

  let bars = "";
  counts.forEach((d, i) => {
    const x = pad + i * ((w - pad * 2) / counts.length) + 2;
    const barH = (d.count / maxCount) * (h - pad - 10);
    const y = h - pad - barH;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="#4f8ff7" opacity="0.8"/>`;
    bars += `<text x="${x + barW / 2}" y="${h - 2}" text-anchor="middle" fill="#8b8fa3" font-size="9">S${d.session}</text>`;
    if (d.count > 0) {
      bars += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" fill="#e1e4ed" font-size="9">${d.count}</text>`;
    }
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg">
      ${bars}
    </svg>`;
}

// ── Detail Timeline ──
async function loadDetailTimeline(callerId) {
  try {
    const res = await fetch(`${API}/api/callers/${encodeURIComponent(callerId)}/timeline`);
    if (!res.ok) return;
    const data = await res.json();
    renderDetailTimeline(data, callerId);
  } catch (err) {
    console.error("Timeline error:", err);
  }
}

function renderDetailTimeline(data, callerId) {
  const container = document.getElementById("detail-timeline");
  if (!data || !data.sessions || data.sessions.length === 0) {
    container.innerHTML = "";
    return;
  }

  let html = `<h3>Session History</h3>`;
  data.sessions.forEach((s) => {
    const risk = s.risk_level || "unknown";
    const dateStr = s.date ? formatDate(s.date) : "";

    html += `<div class="detail-session-card risk-border-${risk}">`;
    html += `<div class="detail-session-header">`;
    html += `<span>Session ${s.session_number} &middot; ${escapeHtml(s.volunteer)}</span>`;
    html += `<span class="risk-badge risk-${risk}">${risk}</span>`;
    html += `</div>`;
    html += `<div class="detail-session-date">${dateStr}</div>`;
    if (s.summary) {
      html += `<div class="detail-session-summary">${escapeHtml(s.summary)}</div>`;
    }
    html += `<button class="btn-replay" onclick="startReplay('${escapeAttr(callerId)}', ${s.session_number})">Replay Session</button>`;
    html += `</div>`;
  });

  container.innerHTML = html;
}

// ── Session Replay ──
async function startReplay(callerId, sessionNumber) {
  stopReplay();
  document.getElementById("replay-section").style.display = "block";
  document.getElementById("replay-messages").innerHTML = "";
  document.getElementById("replay-status").textContent = "Loading...";

  try {
    const res = await fetch(
      `${API}/api/callers/${encodeURIComponent(callerId)}/sessions/${sessionNumber}`
    );
    if (!res.ok) throw new Error("Session not found");
    const data = await res.json();

    replayMessages = data.conversation || [];
    replayIndex = 0;
    replayPlaying = false;
    document.getElementById("replay-play").textContent = "Play";
    document.getElementById("replay-status").textContent =
      `${replayMessages.length} messages — Session ${sessionNumber}`;
  } catch (err) {
    document.getElementById("replay-status").textContent = "Error: " + err.message;
  }
}

function toggleReplay() {
  if (replayPlaying) {
    stopReplay();
  } else {
    replayPlaying = true;
    document.getElementById("replay-play").textContent = "Pause";
    playNextMessage();
  }
}

function playNextMessage() {
  if (!replayPlaying || replayIndex >= replayMessages.length) {
    replayPlaying = false;
    document.getElementById("replay-play").textContent = "Play";
    if (replayIndex >= replayMessages.length) {
      document.getElementById("replay-status").textContent += " (complete)";
    }
    return;
  }

  const msg = replayMessages[replayIndex];
  const container = document.getElementById("replay-messages");

  const div = document.createElement("div");
  div.className = `message message-${msg.role === "caller" ? "caller" : "volunteer"}`;

  const sender = document.createElement("div");
  sender.className = "sender";
  sender.textContent = msg.role === "caller" ? "Caller" : "Volunteer";

  const text = document.createElement("div");
  text.textContent = msg.content;

  div.appendChild(sender);
  div.appendChild(text);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  replayIndex++;
  const delay = msg.role === "caller" ? 1500 : 800;
  replayTimer = setTimeout(playNextMessage, delay);
}

function stopReplay() {
  replayPlaying = false;
  if (replayTimer) {
    clearTimeout(replayTimer);
    replayTimer = null;
  }
  document.getElementById("replay-play").textContent = "Play";
}

function closeReplay() {
  stopReplay();
  document.getElementById("replay-section").style.display = "none";
}

// ── Helpers ──
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? text.substring(0, max) + "..." : text;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ── Init ──
loadDashboard();
