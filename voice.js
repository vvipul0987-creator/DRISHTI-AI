// ════════════════════════════════════════════════════════════════════
// voice.js  —  DRISHTI Voice System  v8.0 (FIXED FOR CLICK-LOOP)
// ════════════════════════════════════════════════════════════════════

window.DrishtiVoice = (function () {
"use strict";

// ── Config ──────────────────────────────────────────────────────
const CFG = {
SILENCE_MS       : 1600,
SEND_DELAY_IOS   : 180,
SEND_DELAY_OTHER : 320,
MAX_RETRY        : 2,
CONFIDENCE_MIN   : 0.52,
HISTORY_MAX      : 8,
WAKE_RESTART_MS  : 2000,  // FIXED: 1200 से बढ़ाकर 2000 किया (Anti-Click)
INSTANT_SEND_KEY : "drishti_instant_send",
ANALYTICS_KEY    : "drishti_voice_stats",

WAKE_WORDS: [
  "hey drishti","hi drishti","hello drishti",
  "aye drishti","o drishti","drishti sun",
  "drishti suno","okay drishti","ok drishti",
  "हे दृष्टि","दृष्टि सुनो","दृष्टि","हेलो दृष्टि",
  "hey dristi","hey drishty","hey drishtti",
],
};

// ── State ────────────────────────────────────────────────────────
let _rec          = null;
let _wakeRec      = null;
let _listening    = false;
let _sending      = false;
let _wakeActive   = false;
let _sessionDone  = false;
let _sendTimer    = null;
let _silenceTimer = null;
let _wakeTimer    = null;
let _retries      = 0;
let _latestText   = "";
let _wakeEnabled  = true;

const _memory = [];

// ── Device detect ────────────────────────────────────────────────
const UA         = navigator.userAgent;
const IS_IOS     = /iPad|iPhone|iPod/.test(UA) ||
(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/.test(UA);
const PLATFORM   = IS_IOS ? "iOS" : IS_ANDROID ? "Android" : "Desktop";

const $ = (id)  => document.getElementById(id);
const $q= (sel) => document.querySelector(sel);

// ════════════════════════════════════════════════════════════════
// WAKE WORD ENGINE (FIXED LOGIC)
// ════════════════════════════════════════════════════════════════

function startWakeWord() {
if (!_wakeEnabled || _listening || _sending || _wakeActive) return; // 🛡️ Hard Lock

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) return;

// 🛑 CLEANUP: पुराने किसी भी इंजन को जड़ से खत्म करो (Click-Click Fix)
if (_wakeRec) {
  try { 
    _wakeRec.onstart = _wakeRec.onresult = _wakeRec.onerror = _wakeRec.onend = null; 
    _wakeRec.abort(); 
  } catch (e) {}
  _wakeRec = null;
}

try {
  _wakeRec = new SR();
  _wakeRec.lang            = "hi-IN";
  _wakeRec.continuous      = !IS_IOS;
  _wakeRec.interimResults  = false;
  _wakeRec.maxAlternatives = 5;

  _wakeRec.onstart = () => {
    _wakeActive = true; // 🔒 Lock Set
    console.log("[DRISHTI] Wake word listening...");
    _updateWakeIndicator(true);
  };

  _wakeRec.onresult = (e) => {
    if (_listening || _sending) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      for (let j = 0; j < e.results[i].length; j++) {
        const spoken = e.results[i][j].transcript.toLowerCase().trim();
        if (_isWakeWord(spoken)) {
          _onWakeDetected();
          return;
        }
      }
    }
  };

  _wakeRec.onerror = (e) => {
    _wakeActive = false; // 🔓 Unlock
    _updateWakeIndicator(false);
    if (e.error !== "not-allowed" && e.error !== "aborted") {
      _scheduleWakeRestart();
    }
  };

  _wakeRec.onend = () => {
    _wakeActive = false; // 🔓 Unlock
    _updateWakeIndicator(false);
    if (_wakeEnabled && !_listening && !_sending) {
      _scheduleWakeRestart();
    }
  };

  _wakeRec.start();

} catch (err) {
  _wakeActive = false;
  _scheduleWakeRestart();
}
}

function stopWakeWord() {
if (_wakeTimer) { clearTimeout(_wakeTimer); _wakeTimer = null; }
if (_wakeRec) {
  try { 
    _wakeRec.onstart = _wakeRec.onresult = _wakeRec.onerror = _wakeRec.onend = null;
    _wakeRec.abort(); 
  } catch (e) {}
  _wakeRec = null;
}
_wakeActive = false;
_updateWakeIndicator(false);
}

function _scheduleWakeRestart() {
if (_wakeTimer) return;
_wakeTimer = setTimeout(() => {
  _wakeTimer = null;
  // 🛡️ डबल चेक: क्या अब भी सब शांत है?
  if (_wakeEnabled && !_listening && !_sending && !_wakeActive) {
    startWakeWord();
  }
}, CFG.WAKE_RESTART_MS);
}

function _isWakeWord(spoken) {
return CFG.WAKE_WORDS.some(w => spoken === w || spoken.includes(w) || spoken.includes("drishti") || spoken.includes("दृष्टि"));
}

function _onWakeDetected() {
stopWakeWord();
_showWakeFeedback();
setStatus("👋 Haan! Bol dijiye...", "#8B5CF6");
setTimeout(() => {
  if (!_sending) startListening();
}, 350);
}

function _showWakeFeedback() {
const mic = $("mic");
if (!mic) return;
mic.style.background = "#7C3AED";
mic.style.boxShadow  = "0 0 25px #7C3AED88";
mic.innerHTML        = "👁️";
setTimeout(() => {
  mic.style.background = "#DC2626";
  mic.style.boxShadow  = "";
  mic.innerHTML        = "🔴";
}, 500);
}

function _updateWakeIndicator(active) {
let dot = $("drishti-wake-dot");
if (!dot) {
  dot = document.createElement("span");
  dot.id = "drishti-wake-dot";
  dot.style.cssText = `position:absolute; top:-4px; right:-4px; width:8px; height:8px; border-radius:50%; transition: all 0.3s; pointer-events:none;`;
  const mic = $("mic");
  if (mic) {
    if (getComputedStyle(mic.parentNode).position === "static") mic.parentNode.style.position = "relative";
    mic.parentNode.appendChild(dot);
  }
}
dot.style.background = (active && _wakeEnabled) ? "#22C55E" : "#374151";
}

function _injectWakeToggle() {
if ($("drishti-wake-toggle")) return;
const mic = $("mic");
if (!mic || !mic.parentNode) return;
const btn = document.createElement("button");
btn.id = "drishti-wake-toggle";
btn.style.cssText = `position:absolute; top:-26px; left:0; background:transparent; font-size:11px; padding:2px 8px; border-radius:10px; cursor:pointer; font-family:inherit; transition:all 0.2s; white-space:nowrap;`;
_updateWakeToggleBtn(btn, _wakeEnabled);
btn.onclick = (e) => {
  e.stopPropagation();
  _wakeEnabled = !_wakeEnabled;
  _updateWakeToggleBtn(btn, _wakeEnabled);
  if (_wakeEnabled) {
    setStatus("🟢 Wake word ON", "#22C55E");
    setTimeout(startWakeWord, 500);
  } else {
    stopWakeWord();
    setStatus("Wake word OFF", "#6B7280");
  }
};
mic.parentNode.style.position = "relative";
mic.parentNode.appendChild(btn);
}

function _updateWakeToggleBtn(btn, on) {
btn.textContent = on ? "🟢 Hey DRISHTI" : "⚫ Wake OFF";
btn.style.color  = on ? "#22C55E" : "#6B7280";
btn.style.border = on ? "1px solid #22C55E55" : "1px solid #37415155";
}

// ── Innovation Logic (Punctuation, Memory, Analytics, Toggle) ──
function addPunctuation(text) {
if (!text || !text.trim()) return text;
let t = text.trim();
if (/[.?!\u0964\u0965]$/.test(t)) return t;
const lower = t.toLowerCase();
const qWords = ["क्या","कैसे","kya","kaise","what","how","why"];
if (qWords.some(w => lower.startsWith(w))) return t + "?";
return t + (/[\u0900-\u097F]/.test(t) ? "।" : ".");
}

function showRetryButton(lastText) {
const old = $("drishti-retry-btn"); if (old) old.remove();
const btn = document.createElement("button");
btn.id = "drishti-retry-btn"; btn.textContent = "🔄 Galat tha — dobara bolo";
btn.style.cssText = `position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#1E293B; color:#F59E0B; border:1px solid #F59E0B; border-radius:20px; padding:8px 18px; font-size:13px; cursor:pointer; z-index:9999;`;
btn.onclick = () => { btn.remove(); $("inp").value = ""; startListening(); };
document.body.appendChild(btn);
setTimeout(() => { if (btn.parentNode) btn.remove(); }, 5000);
}

function saveToMemory(text) {
if (!text) return; _memory.push({ text: text.trim(), time: Date.now() });
if (_memory.length > CFG.HISTORY_MAX) _memory.shift();
}

function resolveContextualText(text) {
const lower = text.toLowerCase().trim();
if (lower.includes("wahi bhejo") || lower.includes("repeat")) {
  for (let i = _memory.length - 1; i >= 0; i--) if (!_memory[i].wasRetried) return _memory[i].text;
}
return text;
}

const _analytics = {
record(lang, ok) {
  let d = JSON.parse(localStorage.getItem(CFG.ANALYTICS_KEY) || "{}");
  d.total = (d.total || 0) + 1; d[lang] = (d[lang] || 0) + 1;
  localStorage.setItem(CFG.ANALYTICS_KEY, JSON.stringify(d));
},
preferredLang() {
  let d = JSON.parse(localStorage.getItem(CFG.ANALYTICS_KEY) || "{}");
  return (d["hi-IN"] || 0) >= (d["en-IN"] || 0) ? "hi-IN" : "en-IN";
}
};

const isInstant = () => localStorage.getItem(CFG.INSTANT_SEND_KEY) === "true";
function _injectInstantToggle() {
if ($("drishti-instant-btn")) return;
const btn = document.createElement("button");
btn.id = "drishti-instant-btn";
btn.style.cssText = `position:absolute; top:-26px; right:0; background:transparent; font-size:11px; padding:2px 7px; border-radius:10px; cursor:pointer;`;
_updateInstantBtn(btn, isInstant());
btn.onclick = () => {
  const next = !isInstant(); localStorage.setItem(CFG.INSTANT_SEND_KEY, String(next));
  _updateInstantBtn(btn, next);
};
$("mic").parentNode.appendChild(btn);
}
function _updateInstantBtn(btn, on) { btn.textContent = on ? "⚡ Instant" : "🕐 Normal"; btn.style.color = on ? "#F59E0B" : "#9CA3AF"; }

// ── Core Helpers ──
function setStatus(msg, color) { const el = $("sbar"); if (el) { el.textContent = msg; el.style.color = color || "#6B7280"; } }
function setInput(val, color) { const el = $("inp"); if (el) { el.value = val; if (color) el.style.color = color; } }
function setMicUI(state) {
const mic = $("mic"); if (!mic) return;
const MIC_STATES = {
  idle: { bg:"#EC4899", html:"🎙", anim:"none" },
  listening: { bg:"#DC2626", html:"🔴", anim:"drishti-pulse 1.2s infinite" },
  processing: { bg:"#D97706", html:"⏳", anim:"none" },
  sending: { bg:"#059669", html:"✅", anim:"none" }
};
const s = MIC_STATES[state] || MIC_STATES.idle;
mic.style.background = s.bg; mic.innerHTML = s.html; mic.style.animation = s.anim;
}

function scrollToBottom() { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }
function getLang() { return (window.DrishtiLang && window.DrishtiLang.current === "english") ? "en-IN" : "hi-IN"; }
function cleanText(text) { return text.trim().replace(/\s+/g, " "); }

// ── Recognition Lifecycle (FIXED) ──
function _destroyRec() {
if (_rec) { try { _rec.onstart = _rec.onresult = _rec.onerror = _rec.onend = null; _rec.abort(); } catch (e) {} _rec = null; }
if (_silenceTimer) clearTimeout(_silenceTimer);
if (_sendTimer) clearTimeout(_sendTimer);
}

function _resetIdle() {
_destroyRec();
_listening = _sending = _sessionDone = false; _latestText = "";
setMicUI("idle");
setStatus(_wakeEnabled ? "Ready! 'Hey DRISHTI' boliye" : "Ready! Tap mic");
// 🛡️ Anti-Conflict: 1.5s Cooldown before wake word restarts
if (_wakeEnabled) setTimeout(() => { if(!_listening) startWakeWord(); }, 1500);
}

function _executeSend(rawText) {
if (_sending || _sessionDone) return;
_sending = _sessionDone = true;
let text = addPunctuation(cleanText(resolveContextualText(rawText)));
setInput(text, "#ffffff"); setMicUI("sending"); setStatus("Bhej rahi hoon...", "#059669");
_destroyRec();
_analytics.record(getLang(), true); saveToMemory(text);
_sendTimer = setTimeout(() => {
  if (window.send) window.send();
  setTimeout(() => { showRetryButton(text); _resetIdle(); }, 700);
}, IS_IOS ? CFG.SEND_DELAY_IOS : CFG.SEND_DELAY_OTHER);
}

function _armSilence(text) {
if (_silenceTimer) clearTimeout(_silenceTimer);
if (!text || _sessionDone) return;
if (isInstant()) { _executeSend(text); return; }
_silenceTimer = setTimeout(() => { if (!_sessionDone && _latestText.trim()) _executeSend(_latestText); }, CFG.SILENCE_MS);
}

// ── Main Listening Engine ──
function startListening() {
if (_listening || _sending) return;
stopWakeWord(); // 🛡️ Ensure wake word is dead
_destroyRec();
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) return;

_rec = new SR(); _sessionDone = false; _latestText = "";
_rec.lang = getLang(); _rec.interimResults = !IS_IOS; _rec.continuous = false;

_rec.onstart = () => { _listening = true; setMicUI("listening"); setStatus("🎙 Sun rahi hoon...", "#8B5CF6"); };
_rec.onresult = (e) => {
  let interim = "", final = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) final += e.results[i][0].transcript;
    else interim += e.results[i][0].transcript;
  }
  _latestText = final || interim; setInput(_latestText, final ? "#fff" : "#A855F7");
  if (final) _executeSend(final); else _armSilence(interim);
};
_rec.onerror = () => _resetIdle();
_rec.onend = () => { if (!_sending && !_sessionDone) _resetIdle(); };
_rec.start();
}

function stopListening() { _destroyRec(); _resetIdle(); }

function init() {
const mic = $("mic");
if (mic) {
  mic.onclick = () => { if (_listening) stopListening(); else startListening(); };
}
_injectWakeToggle(); _injectInstantToggle();
const style = document.createElement("style");
style.textContent = `@keyframes drishti-pulse { 0% { box-shadow:0 0 0 0 #DC262666; } 100% { box-shadow:0 0 0 15px #DC262600; } }`;
document.head.appendChild(style);
setTimeout(() => { if (_wakeEnabled) startWakeWord(); }, 1500);
}

init();

return { init, start: startListening, stop: stopListening };
})();
