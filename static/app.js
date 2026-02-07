const API = "";

let state = {
  sessionId: null,
  callerID: "",
  volunteerName: "",
  language: "en",
  sending: false,
  timerInterval: null,
  timerStart: null,
  riskHistory: [],
  coachingHistory: [],
  lastLiveContext: null,
};

// ── i18n ──
const i18n = {
  en: {
    appTitle: "Crisis Memory Bridge",
    appSubtitle: "Continuous care through AI-powered memory. Volunteer context is preserved across sessions so callers never have to re-explain their situation.",
    volunteerLabel: "Volunteer Name",
    volunteerPlaceholder: "e.g. Volunteer A",
    callerIdLabel: "Caller ID",
    callerIdPlaceholder: "e.g. caller-001",
    callerIdHint: "Use the same ID for returning callers to demonstrate memory handoff",
    languageLabel: "Language",
    languageHint: "Caller AI will respond in the selected language",
    startBtn: "Start Session",
    connecting: "Connecting...",
    supLink: "Supervisor Dashboard",
    callerTyping: "Caller is typing...",
    inputPlaceholder: "Type your response as the volunteer...",
    sendBtn: "Send",
    exportBtn: "Export Transcript",
    endBtn: "End Session & Save Memories",
    callerContext: "Caller Context",
    contextEmpty: "Context will appear here as the conversation progresses...",
    extractingTitle: "Extracting Memories",
    extractingDesc: "Analyzing conversation and saving structured memories for future volunteers...",
    emergencyHeader: "EMERGENCY PROTOCOL",
    emergencySubtitle: "Risk level has escalated to HIGH. Follow these steps:",
    emergencySteps: [
      'Ask: "Are you safe right now? Are you thinking about hurting yourself?"',
      "Assess: Do they have a plan? Access to means? A timeline?",
      'Identify: "Is there someone who can be with you right now?"',
      "Provide resources: Emergency 110 / Inochi no Denwa 0570-783-556 / TELL 03-5774-0992",
      "Plan: Agree on immediate next steps before ending the call",
    ],
    emergencyAck: "I Understand \u2014 Return to Session",
    returning: "RETURNING",
    newCaller: "NEW CALLER",
    caller: "Caller",
    volunteer: "Volunteer",
    session: "Session",
    riskLevel: "RISK LEVEL",
    currentMood: "CURRENT MOOD",
    triggers: "TRIGGERS",
    warnings: "WARNINGS",
    whatWorks: "WHAT WORKS",
    keyFacts: "KEY FACTS",
    addressed: "ADDRESSED",
    riskArc: "RISK ARC",
    changesSince: "CHANGES SINCE LAST SESSION",
    diffNew: "NEW",
    diffWorked: "WORKED",
    diffEscalated: "ESCALATED",
    memoryTimeline: "MEMORY TIMELINE",
    sessionLabel: "Session",
    memoriesExtracted: "Memories Extracted & Saved",
    riskLevelLabel: "Risk Level:",
    summaryLabel: "Summary:",
    triggersLabel: "Triggers:",
    whatWorkedLabel: "What Worked:",
    safetyPlanLabel: "Safety Plan:",
    warningsLabel: "Warnings:",
    startNewSession: "Start New Session",
    returningCallerMsg: "Returning caller detected. {count} session(s) on record. Review the context panel before speaking.",
    newCallerMsg: "New caller connected. No prior history. Begin the conversation.",
    endConfirm: "End this session? Memories will be extracted and saved.",
    volPerformance: "Volunteer Performance",
    exchanges: "Exchanges",
    duration: "Duration",
    good: "Good",
    needsImprovement: "Needs Improvement",
    caution: "Caution",
    techniquesUsed: "Techniques Used",
    riskEscalation: "RISK ESCALATION",
    arcLow: "LOW",
    arcMod: "MOD",
    arcHigh: "HIGH",
    riskLow: "Low",
    riskModerate: "Moderate",
    riskHigh: "High",
    riskUnknown: "Unknown",
  },
  ja: {
    appTitle: "クライシスメモリーブリッジ",
    appSubtitle: "AIによる記憶で途切れないケアを。ボランティアの交代があっても、発信者の状況は引き継がれます。同じことを何度も説明する必要はありません。",
    volunteerLabel: "ボランティア名",
    volunteerPlaceholder: "例: ボランティアA",
    callerIdLabel: "発信者ID",
    callerIdPlaceholder: "例: caller-001",
    callerIdHint: "リピーターの場合は同じIDを使用してメモリーハンドオフを確認できます",
    languageLabel: "言語",
    languageHint: "発信者AIは選択した言語で応答します",
    startBtn: "セッション開始",
    connecting: "接続中...",
    supLink: "スーパーバイザーダッシュボード",
    callerTyping: "発信者が入力中...",
    inputPlaceholder: "ボランティアとして返信を入力...",
    sendBtn: "送信",
    exportBtn: "記録をエクスポート",
    endBtn: "セッション終了 & 記憶を保存",
    callerContext: "発信者コンテキスト",
    contextEmpty: "会話が進むにつれてコンテキストがここに表示されます...",
    extractingTitle: "記憶を抽出中",
    extractingDesc: "会話を分析し、将来のボランティアのために構造化された記憶を保存しています...",
    emergencyHeader: "緊急プロトコル",
    emergencySubtitle: "リスクレベルが「高」に上昇しました。以下の手順に従ってください：",
    emergencySteps: [
      '確認：「今、安全ですか？自分を傷つけることを考えていますか？」',
      "評価：計画はありますか？手段へのアクセスは？タイムラインは？",
      '特定：「今、一緒にいてくれる人はいますか？」',
      "リソース提供：緊急通報 110 / いのちの電話 0570-783-556 / TELL 03-5774-0992",
      "計画：通話終了前に次のステップについて合意する",
    ],
    emergencyAck: "了解しました \u2014 セッションに戻る",
    returning: "リピーター",
    newCaller: "新規発信者",
    caller: "発信者",
    volunteer: "ボランティア",
    session: "セッション",
    riskLevel: "リスクレベル",
    currentMood: "現在の気分",
    triggers: "トリガー",
    warnings: "注意事項",
    whatWorks: "効果的な方法",
    keyFacts: "重要な事実",
    addressed: "対処済み",
    riskArc: "リスク推移",
    changesSince: "前回セッションからの変更",
    diffNew: "新規",
    diffWorked: "効果的",
    diffEscalated: "上昇",
    memoryTimeline: "記憶タイムライン",
    sessionLabel: "セッション",
    memoriesExtracted: "記憶の抽出・保存完了",
    riskLevelLabel: "リスクレベル：",
    summaryLabel: "概要：",
    triggersLabel: "トリガー：",
    whatWorkedLabel: "効果的だった方法：",
    safetyPlanLabel: "安全計画：",
    warningsLabel: "注意事項：",
    startNewSession: "新しいセッションを開始",
    returningCallerMsg: "リピーターを検出しました。{count}回のセッション記録があります。発言前にコンテキストパネルを確認してください。",
    newCallerMsg: "新規発信者が接続しました。過去の履歴はありません。会話を始めてください。",
    endConfirm: "このセッションを終了しますか？記憶が抽出・保存されます。",
    volPerformance: "ボランティアパフォーマンス",
    exchanges: "やり取り回数",
    duration: "所要時間",
    good: "良好",
    needsImprovement: "改善が必要",
    caution: "注意",
    techniquesUsed: "使用したテクニック",
    riskEscalation: "リスク上昇",
    arcLow: "低",
    arcMod: "中",
    arcHigh: "高",
    riskLow: "低",
    riskModerate: "中",
    riskHigh: "高",
    riskUnknown: "不明",
  },
};

function t(key) {
  return i18n[state.language]?.[key] ?? i18n.en[key] ?? key;
}

function translateRisk(level) {
  const key = "risk" + level.charAt(0).toUpperCase() + level.slice(1);
  return t(key);
}

// ── DOM refs ──
const setupScreen = document.getElementById("setup-screen");
const chatScreen = document.getElementById("chat-screen");
const messagesDiv = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const endBtn = document.getElementById("end-btn");
const startBtn = document.getElementById("start-btn");
const volunteerInput = document.getElementById("volunteer-name");
const callerInput = document.getElementById("caller-id");

const headerTitle = document.getElementById("header-title");
const headerBadge = document.getElementById("header-badge");
const volunteerTag = document.getElementById("volunteer-tag");

const sessionDiffDiv = document.getElementById("session-diff");
const briefingBlock = document.getElementById("briefing-block");
const contextEmpty = document.getElementById("context-empty");
const liveContextDiv = document.getElementById("live-context");

const timelineContainer = document.getElementById("timeline-container");

const suggestionsDiv = document.getElementById("suggestions");
const timerEl = document.getElementById("session-timer");
const exportBtn = document.getElementById("export-btn");
const emergencyOverlay = document.getElementById("emergency-overlay");
const emergencyAckBtn = document.getElementById("emergency-ack-btn");
const moodArcContainer = document.getElementById("mood-arc");

const extractionOverlay = document.getElementById("extraction-overlay");
const extractionResult = document.getElementById("extraction-result");

// ── Apply Language to UI ──
function applyLanguage() {
  // Setup screen
  document.querySelector(".setup-card h1").textContent = t("appTitle");
  document.querySelector(".setup-card .subtitle").textContent = t("appSubtitle");

  const labels = document.querySelectorAll(".form-group label");
  if (labels[0]) labels[0].textContent = t("volunteerLabel");
  if (labels[1]) labels[1].textContent = t("callerIdLabel");
  if (labels[2]) labels[2].textContent = t("languageLabel");

  volunteerInput.placeholder = t("volunteerPlaceholder");
  callerInput.placeholder = t("callerIdPlaceholder");

  const hints = document.querySelectorAll(".form-group .hint");
  if (hints[0]) hints[0].textContent = t("callerIdHint");
  if (hints[1]) hints[1].textContent = t("languageHint");

  startBtn.textContent = t("startBtn");
  document.querySelector(".sup-link").textContent = t("supLink");

  // Chat screen
  typingIndicator.textContent = t("callerTyping");
  messageInput.placeholder = t("inputPlaceholder");
  sendBtn.textContent = t("sendBtn");
  exportBtn.textContent = t("exportBtn");
  endBtn.textContent = t("endBtn");
  document.querySelector(".context-panel h3").textContent = t("callerContext");
  contextEmpty.textContent = t("contextEmpty");

  // Extraction overlay
  document.querySelector(".extraction-card h3").textContent = t("extractingTitle");
  document.querySelector(".extraction-card > p").textContent = t("extractingDesc");

  // Emergency protocol
  document.querySelector(".emergency-header").textContent = t("emergencyHeader");
  document.querySelector(".emergency-subtitle").textContent = t("emergencySubtitle");
  const steps = t("emergencySteps");
  const checklistLabels = emergencyOverlay.querySelectorAll(".emergency-checklist label");
  checklistLabels.forEach((label, i) => {
    if (i >= steps.length) return;
    const cb = label.querySelector("input[type=checkbox]");
    const wasChecked = cb ? cb.checked : false;
    label.innerHTML = "";
    const newCb = document.createElement("input");
    newCb.type = "checkbox";
    newCb.checked = wasChecked;
    label.appendChild(newCb);
    label.appendChild(document.createTextNode(" " + steps[i]));
  });
  emergencyAckBtn.textContent = t("emergencyAck");

  // Update HTML lang attribute
  document.documentElement.lang = state.language === "ja" ? "ja" : "en";
}

// ── Language Selector ──
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("lang-active"));
    btn.classList.add("lang-active");
    state.language = btn.dataset.lang;
    applyLanguage();
  });
});

// ── Start Session ──
startBtn.addEventListener("click", startSession);
volunteerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startSession();
});
callerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startSession();
});

async function startSession() {
  const volunteer = volunteerInput.value.trim();
  const callerId = callerInput.value.trim();

  if (!volunteer || !callerId) return;

  startBtn.disabled = true;
  startBtn.textContent = t("connecting");

  try {
    const res = await fetch(`${API}/api/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caller_id: callerId,
        volunteer_name: volunteer,
        language: state.language,
      }),
    });
    const data = await res.json();

    state.sessionId = data.session_id;
    state.callerID = callerId;
    state.volunteerName = volunteer;

    // Update header
    headerTitle.textContent = `${t("session")}: ${callerId}`;
    volunteerTag.textContent = `${t("volunteer")}: ${volunteer}`;

    if (data.is_returning) {
      headerBadge.textContent = t("returning");
      headerBadge.className = "badge badge-returning";
      headerBadge.style.display = "inline-block";

      // Show session diff if available
      renderSessionDiff(data.session_diff);

      briefingBlock.textContent = data.briefing;
      briefingBlock.style.display = "block";

      const count = data.caller_memory?.sessions?.length || "?";
      addSystemMessage(t("returningCallerMsg").replace("{count}", count));

      // Load and display the memory timeline for returning callers
      loadTimeline(callerId);
    } else {
      headerBadge.textContent = t("newCaller");
      headerBadge.className = "badge badge-new";
      headerBadge.style.display = "inline-block";

      sessionDiffDiv.style.display = "none";
      briefingBlock.style.display = "none";

      addSystemMessage(t("newCallerMsg"));
    }

    // Show initial suggestions
    renderSuggestions(data.suggestions);

    // Reset session tracking state
    state.riskHistory = [];
    state.coachingHistory = [];
    state.lastLiveContext = null;
    moodArcContainer.innerHTML = "";

    // Switch screens
    setupScreen.classList.add("hidden");
    chatScreen.classList.add("active");
    startTimer();
    messageInput.focus();
  } catch (err) {
    alert("Failed to start session: " + err.message);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = t("startBtn");
  }
}

// ── Send Message ──
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || state.sending) return;

  state.sending = true;
  sendBtn.disabled = true;
  messageInput.value = "";
  clearSuggestions();

  addMessage("volunteer", text);
  showTyping(true);

  // Build SSE URL with query params
  const params = new URLSearchParams({
    session_id: state.sessionId,
    message: text,
  });
  const streamUrl = `${API}/api/messages/stream?${params.toString()}`;

  // Prepare a caller message bubble that we will stream into
  let callerBubble = null;
  let callerTextEl = null;

  try {
    const res = await fetch(streamUrl);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines from the buffer
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6);
        if (!jsonStr) continue;

        let event;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (event.type === "token") {
          // First token: hide typing indicator and create the caller bubble
          if (!callerBubble) {
            showTyping(false);
            callerBubble = document.createElement("div");
            callerBubble.className = "message message-caller";

            const sender = document.createElement("div");
            sender.className = "sender";
            sender.textContent = t("caller");

            callerTextEl = document.createElement("div");
            callerTextEl.textContent = "";

            callerBubble.appendChild(sender);
            callerBubble.appendChild(callerTextEl);
            messagesDiv.appendChild(callerBubble);
          }
          callerTextEl.textContent += event.content;
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } else if (event.type === "stream_end") {
          // Caller response complete — re-enable input immediately
          showTyping(false);
          if (!callerBubble) {
            addMessage("caller", event.caller_response);
          }
          state.sending = false;
          sendBtn.disabled = false;
          messageInput.focus();
        } else if (event.type === "done") {
          // Context, coaching, and suggestions arrived (async after stream_end)

          // Update live context sidebar
          updateLiveContext(event.live_context);
          state.lastLiveContext = event.live_context;

          // Track risk history for mood arc
          if (event.live_context?.risk_level) {
            state.riskHistory.push(event.live_context.risk_level);
            renderMoodArc();
          }

          // Show coaching feedback and track it
          if (event.coaching) {
            showCoachingTip(event.coaching);
            state.coachingHistory.push(event.coaching);
          }

          // Show risk escalation alert
          if (event.risk_alert) {
            showRiskAlert(event.risk_alert);
            playAlertSound();
            // Trigger emergency protocol on HIGH
            if (event.risk_alert.to === "high") {
              showEmergencyProtocol();
            }
          }

          // Play chime if tab is hidden (new caller message)
          if (document.hidden) {
            playChimeSound();
          }

          // Update reply suggestions
          if (event.suggestions) {
            renderSuggestions(event.suggestions);
          }
        }
      }
    }
  } catch (err) {
    showTyping(false);
    addSystemMessage("Error: " + err.message);
  } finally {
    state.sending = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// ── End Session ──
endBtn.addEventListener("click", endSession);

async function endSession() {
  if (!state.sessionId) return;
  if (!confirm(t("endConfirm"))) return;

  stopTimer();
  extractionOverlay.classList.add("visible");
  extractionResult.innerHTML = "";

  try {
    const res = await fetch(`${API}/api/sessions/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: state.sessionId }),
    });
    const data = await res.json();

    // Show extraction results
    let html = `<h4>${escapeHtml(t("memoriesExtracted"))}</h4>`;
    const mem = data.extracted_memories;

    if (mem.risk_level) {
      html += `<p><strong>${escapeHtml(t("riskLevelLabel"))}</strong> <span class="risk-badge risk-${mem.risk_level}">${escapeHtml(translateRisk(mem.risk_level))}</span></p>`;
    }
    if (mem.session_summary) {
      html += `<p><strong>${escapeHtml(t("summaryLabel"))}</strong> ${escapeHtml(mem.session_summary)}</p>`;
    }
    if (mem.triggers?.length) {
      html += `<p><strong>${escapeHtml(t("triggersLabel"))}</strong></p><ul>${mem.triggers.map(tr => `<li>${escapeHtml(tr)}</li>`).join("")}</ul>`;
    }
    if (mem.effective_strategies?.length) {
      html += `<p><strong>${escapeHtml(t("whatWorkedLabel"))}</strong></p><ul>${mem.effective_strategies.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;
    }
    if (mem.safety_plan?.length) {
      html += `<p><strong>${escapeHtml(t("safetyPlanLabel"))}</strong></p><ul>${mem.safety_plan.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;
    }
    if (mem.warnings?.length) {
      html += `<p><strong>${escapeHtml(t("warningsLabel"))}</strong></p><ul>${mem.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`;
    }

    html += renderPerformanceSummary();
    html += `<br><button class="btn btn-primary" onclick="resetToSetup()">${escapeHtml(t("startNewSession"))}</button>`;
    extractionResult.innerHTML = html;
  } catch (err) {
    extractionResult.innerHTML = `<p>Error: ${err.message}</p><br><button class="btn btn-primary" onclick="resetToSetup()">Back</button>`;
  }
}

function resetToSetup() {
  extractionOverlay.classList.remove("visible");
  chatScreen.classList.remove("active");
  setupScreen.classList.remove("hidden");

  // Reset state
  stopTimer();
  state.sessionId = null;
  state.riskHistory = [];
  state.coachingHistory = [];
  state.lastLiveContext = null;
  messagesDiv.innerHTML = "";
  sessionDiffDiv.style.display = "none";
  sessionDiffDiv.innerHTML = "";
  briefingBlock.style.display = "none";
  timelineContainer.innerHTML = "";
  liveContextDiv.innerHTML = "";
  moodArcContainer.innerHTML = "";
  contextEmpty.style.display = "block";
  messageInput.value = "";
  timerEl.textContent = "00:00";
  clearSuggestions();
  applyLanguage();

  // Keep volunteer name, clear caller ID for next session
  callerInput.value = "";
  callerInput.focus();
}

// ── UI Helpers ──
function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = `message message-${role}`;

  const sender = document.createElement("div");
  sender.className = "sender";
  sender.textContent = role === "volunteer" ? state.volunteerName : t("caller");

  const text = document.createElement("div");
  text.textContent = content;

  div.appendChild(sender);
  div.appendChild(text);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(content) {
  const div = document.createElement("div");
  div.className = "message message-system";
  div.textContent = content;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTyping(show) {
  typingIndicator.classList.toggle("visible", show);
  if (show) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// ── Voice Input ──
const micBtn = document.getElementById("mic-btn");
let recognition = null;
let isListening = false;

function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.style.display = "none";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = state.language === "ja" ? "ja-JP" : "en-US";

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    messageInput.value = transcript;
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("mic-active");
  };

  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove("mic-active");
  };

  micBtn.addEventListener("click", toggleVoice);
}

function toggleVoice() {
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
    isListening = false;
    micBtn.classList.remove("mic-active");
  } else {
    // Update recognition language before starting
    recognition.lang = state.language === "ja" ? "ja-JP" : "en-US";
    messageInput.value = "";
    recognition.start();
    isListening = true;
    micBtn.classList.add("mic-active");
  }
}

initVoiceInput();

// ── Risk Escalation Alerts ──
function showRiskAlert(alert) {
  // Remove any existing alert
  const existing = document.querySelector(".risk-alert");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = "risk-alert";
  el.innerHTML = `<span class="risk-alert-icon">\u26A0</span> ${escapeHtml(t("riskEscalation"))}: ${escapeHtml(alert.from)} \u2192 ${escapeHtml(alert.to)}`;

  // Insert at top of chat panel (before messages)
  const chatPanel = document.querySelector(".chat-panel");
  chatPanel.insertBefore(el, chatPanel.firstChild);

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    el.classList.add("risk-alert-dismiss");
    setTimeout(() => el.remove(), 500);
  }, 8000);
}

// ── Coaching Tips ──
function showCoachingTip(coaching) {
  if (!coaching || !coaching.feedback) return;

  // Remove any existing coaching tip
  const existing = document.querySelector(".coaching-tip");
  if (existing) existing.remove();

  const tip = document.createElement("div");
  tip.className = `coaching-tip coaching-${coaching.score || "good"}`;

  const icon = coaching.score === "good" ? "\u2713" : coaching.score === "caution" ? "!" : "\u25CB";
  const technique = coaching.technique ? `<span class="coaching-technique">${escapeHtml(coaching.technique)}</span>` : "";

  tip.innerHTML = `<span class="coaching-icon">${icon}</span> ${escapeHtml(coaching.feedback)} ${technique}`;
  messagesDiv.appendChild(tip);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Auto-fade after 12 seconds
  setTimeout(() => {
    tip.classList.add("coaching-fade");
  }, 12000);
}

// ── Session Diff ──
function renderSessionDiff(diff) {
  if (!diff) {
    sessionDiffDiv.style.display = "none";
    return;
  }

  const hasNew = diff.new_info && diff.new_info.length > 0;
  const hasEscalations = diff.escalations && diff.escalations.length > 0;
  const hasStrategies = diff.new_strategies && diff.new_strategies.length > 0;

  if (!hasNew && !hasEscalations && !hasStrategies) {
    sessionDiffDiv.style.display = "none";
    return;
  }

  let html = `<div class="diff-header">${escapeHtml(t("changesSince"))}</div>`;

  if (hasEscalations) {
    diff.escalations.forEach((e) => {
      html += `<div class="diff-item diff-escalation">${escapeHtml(e)}</div>`;
    });
  }

  if (hasNew) {
    diff.new_info.forEach((item) => {
      html += `<div class="diff-item diff-new">${escapeHtml(t("diffNew"))}: ${escapeHtml(item)}</div>`;
    });
  }

  if (hasStrategies) {
    diff.new_strategies.forEach((s) => {
      html += `<div class="diff-item diff-strategy">${escapeHtml(t("diffWorked"))}: ${escapeHtml(s)}</div>`;
    });
  }

  sessionDiffDiv.innerHTML = html;
  sessionDiffDiv.style.display = "block";
}

// ── Memory Timeline ──
async function loadTimeline(callerId) {
  try {
    const res = await fetch(`${API}/api/callers/${encodeURIComponent(callerId)}/timeline`);
    if (!res.ok) return;
    const data = await res.json();
    renderTimeline(data);
  } catch (err) {
    console.error("Failed to load timeline:", err);
  }
}

function renderTimeline(data) {
  if (!data || !data.sessions || data.sessions.length === 0) {
    timelineContainer.innerHTML = "";
    return;
  }

  const sessions = data.sessions;
  const locale = state.language === "ja" ? "ja-JP" : "en-US";

  let html = `<div class="timeline">`;
  html += `<div class="timeline-header">${escapeHtml(t("memoryTimeline"))}</div>`;
  html += `<div class="timeline-track">`;

  sessions.forEach((session, idx) => {
    const risk = session.risk_level || "unknown";
    const riskClass = `risk-${risk}`;

    // Format date
    let dateStr = "";
    if (session.date) {
      try {
        const d = new Date(session.date);
        dateStr = d.toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        dateStr = session.date;
      }
    }

    html += `<div class="timeline-node ${riskClass}">`;
    html += `<div class="timeline-card">`;

    // Card header: session label + risk badge
    html += `<div class="timeline-card-header">`;
    html += `<span class="timeline-session-label">${escapeHtml(t("sessionLabel"))} ${session.session_number}</span>`;
    html += `<span class="timeline-risk-badge ${riskClass}">${translateRisk(risk)}</span>`;
    html += `</div>`;

    // Meta: volunteer + date
    html += `<div class="timeline-meta">${escapeHtml(session.volunteer)}`;
    if (dateStr) {
      html += ` &middot; ${dateStr}`;
    }
    html += `</div>`;

    // Summary (truncated for display)
    if (session.summary) {
      const truncated =
        session.summary.length > 150
          ? session.summary.substring(0, 150) + "..."
          : session.summary;
      html += `<div class="timeline-summary">${escapeHtml(truncated)}</div>`;
    }

    // New info
    if (session.new_info && session.new_info.length > 0) {
      html += `<ul class="timeline-diff-list timeline-diff-new">`;
      session.new_info.forEach((item) => {
        const truncatedItem =
          item.length > 100 ? item.substring(0, 100) + "..." : item;
        html += `<li>${escapeHtml(truncatedItem)}</li>`;
      });
      html += `</ul>`;
    }

    // Escalations
    if (session.escalations && session.escalations.length > 0) {
      html += `<ul class="timeline-diff-list timeline-diff-escalation">`;
      session.escalations.forEach((item) => {
        html += `<li>${escapeHtml(t("diffEscalated"))}: ${escapeHtml(item)}</li>`;
      });
      html += `</ul>`;
    }

    // New strategies (things that worked)
    if (session.new_strategies && session.new_strategies.length > 0) {
      html += `<ul class="timeline-diff-list timeline-diff-resolved">`;
      session.new_strategies.forEach((item) => {
        html += `<li>${escapeHtml(item)}</li>`;
      });
      html += `</ul>`;
    }

    // Resolved (backward compatibility)
    if (session.resolved && session.resolved.length > 0) {
      html += `<ul class="timeline-diff-list timeline-diff-resolved">`;
      session.resolved.forEach((item) => {
        html += `<li>${escapeHtml(item)}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`; // .timeline-card
    html += `</div>`; // .timeline-node
  });

  html += `</div>`; // .timeline-track
  html += `</div>`; // .timeline

  timelineContainer.innerHTML = html;
}

// ── Reply Suggestions ──
function renderSuggestions(suggestions) {
  suggestionsDiv.innerHTML = "";
  if (!suggestions || suggestions.length === 0) return;

  suggestions.forEach((text) => {
    const chip = document.createElement("button");
    chip.className = "suggestion-chip";
    chip.textContent = text;
    chip.addEventListener("click", () => {
      messageInput.value = text;
      messageInput.focus();
    });
    suggestionsDiv.appendChild(chip);
  });
}

function clearSuggestions() {
  suggestionsDiv.innerHTML = "";
}

// ── Session Timer ──
function startTimer() {
  state.timerStart = Date.now();
  timerEl.textContent = "00:00";
  state.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    timerEl.textContent = `${min}:${sec}`;
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

// ── Sound Notifications ──
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playAlertSound() {
  try {
    ensureAudio();
    [520, 680].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.value = 0.15;
      osc.start(audioCtx.currentTime + i * 0.15);
      osc.stop(audioCtx.currentTime + i * 0.15 + 0.12);
    });
  } catch (e) { /* audio not available */ }
}

function playChimeSound() {
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) { /* audio not available */ }
}

// ── Emergency Protocol ──
function showEmergencyProtocol() {
  // Reset checkboxes and apply current language text
  const steps = t("emergencySteps");
  const checklistLabels = emergencyOverlay.querySelectorAll(".emergency-checklist label");
  checklistLabels.forEach((label, i) => {
    if (i >= steps.length) return;
    label.innerHTML = "";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + steps[i]));
  });
  document.querySelector(".emergency-header").textContent = t("emergencyHeader");
  document.querySelector(".emergency-subtitle").textContent = t("emergencySubtitle");
  emergencyAckBtn.textContent = t("emergencyAck");
  emergencyOverlay.classList.add("visible");
}

emergencyAckBtn.addEventListener("click", () => {
  emergencyOverlay.classList.remove("visible");
});

// ── Risk Arc (Mood Sparkline) ──
function renderMoodArc() {
  if (state.riskHistory.length < 2) {
    moodArcContainer.innerHTML = "";
    return;
  }

  const riskMap = { low: 1, moderate: 2, high: 3, unknown: 0 };
  const points = state.riskHistory.map((r) => riskMap[r] || 0);

  const w = 300, h = 60, pad = 10;
  const maxVal = 3;
  const step = (w - pad * 2) / (points.length - 1);

  let pathD = "";
  const dots = [];
  points.forEach((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v / maxVal) * (h - pad * 2));
    if (i === 0) pathD += `M ${x} ${y}`;
    else pathD += ` L ${x} ${y}`;

    const color = v === 3 ? "#e55c5c" : v === 2 ? "#e5a84f" : v === 1 ? "#4fc78e" : "#8b8fa3";
    dots.push(`<circle cx="${x}" cy="${y}" r="4" fill="${color}" />`);
  });

  const labels = ["", t("arcLow"), t("arcMod"), t("arcHigh")];
  let labelHtml = "";
  for (let i = 1; i <= 3; i++) {
    const y = h - pad - ((i / maxVal) * (h - pad * 2));
    labelHtml += `<text x="2" y="${y + 3}" fill="#8b8fa3" font-size="7" font-family="sans-serif">${labels[i]}</text>`;
    labelHtml += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="#2e3344" stroke-width="0.5" stroke-dasharray="2,2" />`;
  }

  moodArcContainer.innerHTML = `
    <div class="context-section-title info">${escapeHtml(t("riskArc"))}</div>
    <svg width="100%" viewBox="0 0 ${w} ${h}" class="mood-arc-svg">
      ${labelHtml}
      <path d="${pathD}" fill="none" stroke="#4f8ff7" stroke-width="1.5" opacity="0.6" />
      ${dots.join("")}
    </svg>`;
}

// ── Conversation Export ──
exportBtn.addEventListener("click", exportSession);

function exportSession() {
  const now = new Date();
  const duration = state.timerStart ? formatDuration(Date.now() - state.timerStart) : "Unknown";

  let text = `CRISIS MEMORY BRIDGE — Session Transcript\n`;
  text += `==========================================\n\n`;
  text += `Caller: ${state.callerID}\n`;
  text += `Volunteer: ${state.volunteerName}\n`;
  text += `Date: ${now.toLocaleString()}\n`;
  text += `Duration: ${duration}\n\n`;
  text += `TRANSCRIPT\n`;
  text += `----------\n`;

  const msgs = messagesDiv.querySelectorAll(".message");
  msgs.forEach((msg) => {
    if (msg.classList.contains("message-system")) {
      text += `[SYSTEM] ${msg.textContent.trim()}\n`;
    } else if (msg.classList.contains("message-volunteer")) {
      const content = msg.querySelector("div:last-child")?.textContent || "";
      text += `[VOLUNTEER] ${content.trim()}\n`;
    } else if (msg.classList.contains("message-caller")) {
      const content = msg.querySelector("div:last-child")?.textContent || "";
      text += `[CALLER] ${content.trim()}\n`;
    }
  });

  if (state.lastLiveContext) {
    const ctx = state.lastLiveContext;
    text += `\nCONTEXT SUMMARY\n`;
    text += `---------------\n`;
    if (ctx.risk_level) text += `Risk Level: ${ctx.risk_level}\n`;
    if (ctx.current_mood) text += `Current Mood: ${ctx.current_mood}\n`;
    if (ctx.triggers?.length) text += `Triggers: ${ctx.triggers.join(", ")}\n`;
    if (ctx.warnings?.length) text += `Warnings: ${ctx.warnings.join(", ")}\n`;
    if (ctx.effective_strategies?.length) text += `What Works: ${ctx.effective_strategies.join(", ")}\n`;
    if (ctx.key_facts?.length) text += `Key Facts: ${ctx.key_facts.join(", ")}\n`;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `session-${state.callerID}-${now.toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Volunteer Performance Summary ──
function renderPerformanceSummary() {
  if (state.coachingHistory.length === 0) return "";

  const total = state.coachingHistory.length;
  let good = 0, improve = 0, caution = 0;
  const techniques = {};

  state.coachingHistory.forEach((c) => {
    if (c.score === "good") good++;
    else if (c.score === "needs_improvement") improve++;
    else if (c.score === "caution") caution++;
    if (c.technique) {
      techniques[c.technique] = (techniques[c.technique] || 0) + 1;
    }
  });

  const goodPct = Math.round((good / total) * 100);
  const improvePct = Math.round((improve / total) * 100);
  const cautionPct = Math.round((caution / total) * 100);
  const duration = state.timerStart ? formatDuration(Date.now() - state.timerStart) : "\u2014";

  // Sort techniques by frequency
  const sortedTech = Object.entries(techniques)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let html = `<div class="performance-summary">`;
  html += `<h5>${escapeHtml(t("volPerformance"))}</h5>`;
  html += `<div class="perf-stat"><span>${escapeHtml(t("exchanges"))}</span><span class="perf-value">${total}</span></div>`;
  html += `<div class="perf-stat"><span>${escapeHtml(t("duration"))}</span><span class="perf-value">${escapeHtml(duration)}</span></div>`;
  html += `<div class="perf-bar">`;
  if (goodPct > 0) html += `<div class="perf-bar-good" style="width:${goodPct}%"></div>`;
  if (improvePct > 0) html += `<div class="perf-bar-improve" style="width:${improvePct}%"></div>`;
  if (cautionPct > 0) html += `<div class="perf-bar-caution" style="width:${cautionPct}%"></div>`;
  html += `</div>`;
  html += `<div class="perf-stat"><span style="color:var(--success)">${escapeHtml(t("good"))}</span><span class="perf-value">${good} (${goodPct}%)</span></div>`;
  html += `<div class="perf-stat"><span style="color:var(--warning)">${escapeHtml(t("needsImprovement"))}</span><span class="perf-value">${improve} (${improvePct}%)</span></div>`;
  html += `<div class="perf-stat"><span style="color:var(--danger)">${escapeHtml(t("caution"))}</span><span class="perf-value">${caution} (${cautionPct}%)</span></div>`;

  if (sortedTech.length > 0) {
    html += `<div class="perf-stat" style="margin-top:8px"><span>${escapeHtml(t("techniquesUsed"))}</span></div>`;
    html += `<div class="perf-techniques">`;
    sortedTech.forEach(([name, count]) => {
      html += `<span class="perf-technique-tag">${escapeHtml(name)} (${count}x)</span>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateLiveContext(ctx) {
  if (!ctx || ctx.error) return;

  contextEmpty.style.display = "none";
  let html = "";

  // Risk level
  if (ctx.risk_level && ctx.risk_level !== "unknown") {
    html += `
      <div class="context-section">
        <div class="context-section-title danger">${escapeHtml(t("riskLevel"))}</div>
        <span class="risk-badge risk-${ctx.risk_level}">${translateRisk(ctx.risk_level)}</span>
      </div>`;
  }

  // Current mood
  if (ctx.current_mood) {
    html += `
      <div class="context-section">
        <div class="context-section-title info">${escapeHtml(t("currentMood"))}</div>
        <div class="mood-text">${ctx.current_mood}</div>
      </div>`;
  }

  // Triggers
  if (ctx.triggers?.length) {
    html += `
      <div class="context-section">
        <div class="context-section-title danger">${escapeHtml(t("triggers"))}</div>
        <ul class="context-list">
          ${ctx.triggers.map((tr) => `<li>${tr}</li>`).join("")}
        </ul>
      </div>`;
  }

  // Warnings
  if (ctx.warnings?.length) {
    html += `
      <div class="context-section">
        <div class="context-section-title warning">${escapeHtml(t("warnings"))}</div>
        <ul class="context-list">
          ${ctx.warnings.map((w) => `<li>${w}</li>`).join("")}
        </ul>
      </div>`;
  }

  // What works
  if (ctx.effective_strategies?.length) {
    html += `
      <div class="context-section">
        <div class="context-section-title success">${escapeHtml(t("whatWorks"))}</div>
        <ul class="context-list">
          ${ctx.effective_strategies.map((s) => `<li>${s}</li>`).join("")}
        </ul>
      </div>`;
  }

  // Key facts
  if (ctx.key_facts?.length) {
    html += `
      <div class="context-section">
        <div class="context-section-title info">${escapeHtml(t("keyFacts"))}</div>
        <ul class="context-list">
          ${ctx.key_facts.map((f) => `<li>${f}</li>`).join("")}
        </ul>
      </div>`;
  }

  // Addressed / resolved items (smart forgetting — faded)
  if (ctx.addressed_items?.length) {
    html += `
      <div class="context-section context-addressed">
        <div class="context-section-title addressed">${escapeHtml(t("addressed"))}</div>
        <ul class="context-list">
          ${ctx.addressed_items.map((a) => `<li class="context-item-faded">${a}</li>`).join("")}
        </ul>
      </div>`;
  }

  liveContextDiv.innerHTML = html;
}
