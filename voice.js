// ════════════════════════════════════════════════════════════════════
// voice.js — DRISHTI Voice System v8.0 (STABLE + AUTO-STOP + NO-DOUBLE)
// ════════════════════════════════════════════════════════════════════

window.DrishtiVoice = (function () {
"use strict";

const CFG = {
SILENCE_MS       : 1600, // सन्नाटा होने पर अपने आप रुकने का समय
SEND_DELAY_IOS   : 180,
SEND_DELAY_OTHER : 320,
MAX_RETRY        : 2,
CONFIDENCE_MIN   : 0.3, 
HISTORY_MAX      : 8,
WAKE_RESTART_MS  : 2000, 
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
const UA      = navigator.userAgent;
const IS_IOS  = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const $       = (id)  => document.getElementById(id);

// ── WAKE WORD ENGINE ───────────────────────────────────────────
function startWakeWord() {
if (!_wakeEnabled || _listening || _sending || _wakeActive) return;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) return;

if (_wakeRec) {
  try { _wakeRec.onstart = _wakeRec.onresult = _wakeRec.onerror = _wakeRec.onend = null; _wakeRec.abort(); } catch(e){}
  _wakeRec = null;
}

try {
  _wakeRec = new SR();
  _wakeRec.lang            = "hi-IN";  
  _wakeRec.continuous      = !IS_IOS;  
  _wakeRec.interimResults  = false;    
  _wakeRec.maxAlternatives = 5;        

  _wakeRec.onstart = () => { _wakeActive = true; _updateWakeIndicator(true); };
  _wakeRec.onresult = (e) => {
    if (_listening || _sending) return;
    const spoken = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
    if (_isWakeWord(spoken)) { _onWakeDetected(); }
  };
  _wakeRec.onerror = () => { _wakeActive = false; _scheduleWakeRestart(); };
  _wakeRec.onend = () => { _wakeActive = false; _updateWakeIndicator(false); if (_wakeEnabled && !_listening) _scheduleWakeRestart(); };
  _wakeRec.start();
} catch (err) { _wakeActive = false; _scheduleWakeRestart(); }
}

function stopWakeWord() {
if (_wakeTimer) { clearTimeout(_wakeTimer); _wakeTimer = null; }
if (_wakeRec) { try { _wakeRec.onstart = _wakeRec.onresult = _wakeRec.onerror = _wakeRec.onend = null; _wakeRec.abort(); } catch (e) {} _wakeRec = null; }
_wakeActive = false; _updateWakeIndicator(false);
}

function _scheduleWakeRestart() {
if (_wakeTimer) return;
_wakeTimer = setTimeout(() => { _wakeTimer = null; if (_wakeEnabled && !_listening && !_sending && !_wakeActive) startWakeWord(); }, CFG.WAKE_RESTART_MS);
}

function _isWakeWord(spoken) { return CFG.WAKE_WORDS.some(w => spoken.includes(w)); }
function _onWakeDetected() { stopWakeWord(); _showWakeFeedback(); setStatus("👋 Haan! Boliye...", "#8B5CF6"); setTimeout(() => { if (!_sending) startListening(); }, 350); }

// ── INNOVATION LOGIC (NO CHANGES TO SIZE) ───────────────────────
function addPunctuation(text) {
if (!text || !text.trim()) return text;
let t = text.trim();
if (/[.?!\u0964\u0965]$/.test(t)) return t;
const lower = t.toLowerCase();
const qWords = ["क्या","कैसे","kya","kaise","what","how","why"];
if (qWords.some(w => lower.startsWith(w))) return t + "?";
return t + (/[\u0900-\u097F]/.test(t) ? "।" : ".");
}

function saveToMemory(text) {
if (!text) return; _memory.push({ text: text.trim(), time: Date.now() });
if (_memory.length > CFG.HISTORY_MAX) _memory.shift();
}

const isInstant = () => localStorage.getItem(CFG.INSTANT_SEND_KEY) === "true";

// ── RECOGNITION LIFECYCLE (FIXED: AUTO-STOP & NO-DOUBLE) ────────
function _destroyRec() {
if (_rec) {
  try { 
    _rec.onstart = _rec.onresult = _rec.onerror = _rec.onend = null; 
    _rec.stop(); // 🛑 Hard stop the mic engine
    _rec.abort(); 
  } catch (e) {} 
  _rec = null; 
}
if (_silenceTimer) clearTimeout(_silenceTimer);
if (_sendTimer) clearTimeout(_sendTimer);
}

function _executeSend(rawText) {
if (_sending || _sessionDone || !rawText.trim()) return;
_sessionDone = true;
_sending = true;

// 🛑 Fix 2: ऊपर चैट जाने से पहले माइक को तुरंत "हार्ड बंद" करो
_destroyRec(); 

let text = addPunctuation(rawText.trim());
setInput(text, "#ffffff"); 
setMicUI("sending"); 
setStatus("Bhej rahi hoon...", "#059669");

saveToMemory(text);
_sendTimer = setTimeout(() => {
  if (window.send) window.send();
  setTimeout(_resetIdle, 800);
}, IS_IOS ? CFG.SEND_DELAY_IOS : CFG.SEND_DELAY_OTHER);
}

function _armSilence(text) {
if (_silenceTimer) clearTimeout(_silenceTimer);
if (!text || _sessionDone) return;
if (isInstant()) { _executeSend(text); return; }
_silenceTimer = setTimeout(() => { if (!_sessionDone && _latestText.trim()) _executeSend(_latestText); }, CFG.SILENCE_MS);
}

function startListening() {
if (_listening || _sending) return;
stopWakeWord(); 
_destroyRec();

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) return;

_rec = new SR(); 
_sessionDone = false; 
_latestText = "";
_rec.lang = "hi-IN"; 
_rec.maxAlternatives = 1; // 🎯 Double result रोकने के लिए 1 रखा
_rec.continuous = !IS_IOS;
_rec.interimResults = true; 

_rec.onstart = () => { _listening = true; setMicUI("listening"); setStatus("🎙 Sun rahi hoon...", "#8B5CF6"); };

_rec.onresult = (e) => {
  if (_sessionDone) return; // 🛡️ अगर एक बार फाइनल हो गया तो दोबारा मत लिखो
  
  let interim = "", final = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) final += e.results[i][0].transcript;
    else interim += e.results[i][0].transcript;
  }

  // 🛡️ Fix 1: Double Writing रोकने का लॉजिक
  if (final) {
    _latestText = final;
    setInput(final, "#fff");
    _executeSend(final); // ✅ फाइनल मिलते ही तुरंत सेंड पर भेजो
  } else if (interim) {
    _latestText = interim;
    setInput(interim, "#A855F7");
    _armSilence(interim); 
  }
};

_rec.onerror = () => _resetIdle();
_rec.onend = () => { if (!_sending && !_sessionDone) _resetIdle(); };
try { _rec.start(); } catch (err) { _resetIdle(); }
}

function _resetIdle() {
_destroyRec();
_listening = _sending = _sessionDone = false;
_latestText = "";
setMicUI("idle");
setStatus(_wakeEnabled ? "Ready! 'Hey DRISHTI'" : "Ready! Tap mic");
if (_wakeEnabled) setTimeout(() => { if(!_listening) startWakeWord(); }, 1500);
}

// ── UI HELPERS (NO CHANGES) ────────────────────────────────────
function setMicUI(state) {
const mic = $("mic"); if (!mic) return;
const s = { idle:{bg:"#EC4899",h:"🎙"}, listening:{bg:"#DC2626",h:"🔴"}, sending:{bg:"#059669",h:"✅"} }[state] || {bg:"#EC4899",h:"🎙"};
mic.style.background = s.bg; mic.innerHTML = s.h;
}
function setStatus(m, c) { const el = $("sbar"); if (el) { el.textContent = m; el.style.color = color || "#6B7280"; } }
function setInput(v, c) { const el = $("inp"); if (el) { el.value = v; if (color) el.style.color = color; } }
function _showWakeFeedback() { /* ... feedback code ... */ }
function _updateWakeIndicator(a) { /* ... indicator code ... */ }
function _injectWakeToggle() { /* ... toggle code ... */ }

function init() {
const mic = $("mic");
if (mic) mic.onclick = () => { if (_listening) _resetIdle(); else startListening(); };
setTimeout(() => { if (_wakeEnabled) startWakeWord(); }, 1500);
}

init();
return { init, start: startListening, stop: _destroyRec };
})();
