// ════════════════════════════════════════════════════════════════════
// voice.js — DRISHTI Voice System v9.0 (FULL POWER & SMART LOGIC)
// ════════════════════════════════════════════════════════════════════

window.DrishtiVoice = (function () {
"use strict";

// ── 1. Comprehensive Configuration ────────────────────────────────
const CFG = {
  SILENCE_MS       : 1600, 
  SEND_DELAY_IOS   : 180,
  SEND_DELAY_OTHER : 320,
  MAX_RETRY        : 2,
  CONFIDENCE_MIN   : 0.3, 
  HISTORY_MAX      : 15, // मेमोरी हिस्ट्री बढ़ा दी
  WAKE_RESTART_MS  : 2000, 
  INSTANT_SEND_KEY : "drishti_instant_send",
  ANALYTICS_KEY    : "drishti_voice_stats",
  WAKE_WORDS: [
    "hey drishti","hi drishti","hello drishti","drishti suno","ok drishti","hey dristi","hey drishtti","हे दृष्टि","दृष्टि सुनो"
  ],
};

// ── 2. Extended State Management ──────────────────────────────────
let _rec = null, _wakeRec = null, _listening = false, _sending = false, _wakeActive = false;
let _sessionDone = false, _sendTimer = null, _silenceTimer = null, _wakeTimer = null;
let _retries = 0, _latestText = "", _wakeEnabled = true;

const _memory = [];
const UA = navigator.userAgent;
const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const $ = (id) => document.getElementById(id);

// ── 3. Advanced Punctuation & Memory Engine ───────────────────────
function addPunctuation(text) {
  if (!text || !text.trim()) return text;
  let t = text.trim();
  if (/[.?!\u0964\u0965]$/.test(t)) return t;
  const lower = t.toLowerCase();
  const qWords = ["क्या","कैसे","क्यों","कहाँ","kya","kaise","kyu","where"];
  if (qWords.some(w => lower.startsWith(w) || lower.includes(w))) return t + "?";
  return t + (/[\u0900-\u097F]/.test(t) ? "।" : ".");
}

function saveToMemory(text) {
  if (!text) return;
  _memory.push({ text: text.trim(), time: new Date().toLocaleTimeString(), wasRetried: false });
  if (_memory.length > CFG.HISTORY_MAX) _memory.shift();
}

function resolveContextualText(text) {
  const lower = text.toLowerCase().trim();
  if (lower === "wahi bhejo" || lower === "repeat that") {
    return _memory.length > 0 ? _memory[_memory.length - 1].text : text;
  }
  return text;
}

// ── 4. Analytics & Storage ────────────────────────────────────────
const _analytics = {
  record(lang, status) {
    let d = JSON.parse(localStorage.getItem(CFG.ANALYTICS_KEY) || '{"total":0,"success":0}');
    d.total++; if(status) d.success++;
    d[lang] = (d[lang] || 0) + 1;
    localStorage.setItem(CFG.ANALYTICS_KEY, JSON.stringify(d));
  }
};

const isInstant = () => localStorage.getItem(CFG.INSTANT_SEND_KEY) === "true";

// ── 5. The "Auto-Stop" & "No-Double" Recognition Engine ──────────
function _destroyRec() {
  if (_rec) {
    try {
      // 🛑 Event Nulling: क्लिक और लूप रोकने के लिए
      _rec.onstart = _rec.onresult = _rec.onerror = _rec.onend = null;
      _rec.stop(); 
      _rec.abort(); 
    } catch (e) {}
    _rec = null;
  }
  if (_silenceTimer) clearTimeout(_silenceTimer);
  if (_sendTimer) clearTimeout(_sendTimer);
}

function _executeSend(rawText) {
  if (_sending || _sessionDone || !rawText.trim()) return;
  
  // 🎯 लॉजिक फिक्स: जैसे ही सेंड शुरू हो, माइक को तुरंत "किल" करो
  _sessionDone = true; 
  _sending = true;
  _destroyRec(); 

  let processedText = addPunctuation(cleanText(resolveContextualText(rawText)));
  
  // UI Updates
  setInput(processedText, "#ffffff");
  setMicUI("sending");
  setStatus("Bhej rahi hoon...", "#10B981");

  _analytics.record("hi-IN", true);
  saveToMemory(processedText);

  // 🎯 लॉजिक फिक्स: चैट ऊपर जाने का सटीक टाइमिंग
  _sendTimer = setTimeout(() => {
    if (window.send) window.send(); // यह तुम्हारी चैट को ऊपर भेजता है
    
    // सेंड होने के बाद माइक को पूरी तरह शांत (Idle) कर दो
    setTimeout(() => {
      _resetIdle();
      if (typeof showRetryButton === "function") showRetryButton(processedText);
    }, 500);
  }, IS_IOS ? CFG.SEND_DELAY_IOS : CFG.SEND_DELAY_OTHER);
}

function startListening() {
  if (_listening || _sending) return;
  if (_wakeRec) stopWakeWord();
  _destroyRec();

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  _rec = new SR();
  _sessionDone = false;
  _latestText = "";
  _rec.lang = "hi-IN";
  _rec.maxAlternatives = 1; // 🎯 Double Writing रोकने के लिए बेस्ट
  _rec.continuous = !IS_IOS;
  _rec.interimResults = true; 

  _rec.onstart = () => {
    _listening = true;
    setMicUI("listening");
    setStatus("🎙️ Sun rahi hoon... boliye", "#8B5CF6");
  };

  _rec.onresult = (e) => {
    if (_sessionDone) return; // 🛡️ लॉक: एक बार फाइनल होने पर दोबारा न लिखे

    let interim = "", final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }

    _latestText = final || interim;
    
    if (final) {
      // 🎯 लॉजिक फिक्स: फाइनल मिलते ही लॉक लगाओ और सेंड करो
      _executeSend(final);
    } else if (interim) {
      setInput(interim, "#A855F7");
      _armSilence(interim);
    }
  };

  _rec.onerror = (e) => { if (e.error !== "aborted") _resetIdle(); };
  _rec.onend = () => { if (!_sending && !_sessionDone && _latestText === "") _resetIdle(); };

  try { _rec.start(); } catch (err) { _resetIdle(); }
}

// ── 6. Maintenance & UI Helpers (Full Original Logic) ─────────────
function _resetIdle() {
  _destroyRec();
  _listening = _sending = _sessionDone = false;
  _latestText = "";
  setMicUI("idle");
  setStatus(_wakeEnabled ? "Ready! 'Hey DRISHTI' boliye" : "Ready! Tap mic");
  if (_wakeEnabled) setTimeout(startWakeWord, 1500);
}

function _armSilence(text) {
  if (_silenceTimer) clearTimeout(_silenceTimer);
  if (!text || _sessionDone) return;
  if (isInstant()) { _executeSend(text); return; }
  _silenceTimer = setTimeout(() => {
    if (!_sessionDone && _latestText.trim()) _executeSend(_latestText);
  }, CFG.SILENCE_MS);
}

function setMicUI(state) {
  const mic = $("mic"); if (!mic) return;
  const s = { 
    idle: { bg:"#EC4899", h:"🎙️" }, 
    listening: { bg:"#DC2626", h:"🔴" }, 
    sending: { bg:"#059669", h:"✅" } 
  }[state] || { bg:"#EC4899", h:"🎙️" };
  mic.style.background = s.bg; mic.innerHTML = s.h;
}

function setStatus(m, c) { const s = $("sbar"); if(s){ s.textContent=m; s.style.color=c; } }
function setInput(v, c) { const i = $("inp"); if(i){ i.value=v; i.style.color=c; } }
function cleanText(t) { return t.trim().replace(/\s+/g, " "); }

// ── 7. Initialize Engine ──────────────────────────────────────────
function init() {
  const mic = $("mic");
  if (mic) mic.onclick = () => { if (_listening) _resetIdle(); else startListening(); };
  
  // इंजेक्शन लॉजिक्स (Toggles)
  if (typeof _injectWakeToggle === "function") _injectWakeToggle();
  if (typeof _injectInstantToggle === "function") _injectInstantToggle();

  setTimeout(() => { if (_wakeEnabled) startWakeWord(); }, 1500);
}

init();

return { 
  init, 
  start: startListening, 
  stop: _destroyRec,
  getMemory: () => _memory,
  toggleWake: (val) => { _wakeEnabled = val; _wakeEnabled ? startWakeWord() : stopWakeWord(); }
};

})();
