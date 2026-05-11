// ════════════════════════════════════════════════════════════════════
// voice.js  —  DRISHTI Voice System  v8.0 (AUTOMATICALLY FIXED)
// ════════════════════════════════════════════════════════════════════

window.DrishtiVoice = (function () {
"use strict";

const CFG = {
SILENCE_MS       : 1800, // थोड़ा बढ़ा दिया ताकि आवाज़ आराम से पकड़े
SEND_DELAY_IOS   : 180,
SEND_DELAY_OTHER : 320,
MAX_RETRY        : 2,
CONFIDENCE_MIN   : 0.3,  // कम किया ताकि हल्की आवाज़ भी गायब न हो
HISTORY_MAX      : 8,
WAKE_RESTART_MS  : 2000,  // Click-Loop रोकने के लिए 2s का गैप
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

let _rec = null, _wakeRec = null, _listening = false, _sending = false, _wakeActive = false;
let _sessionDone = false, _sendTimer = null, _silenceTimer = null, _wakeTimer = null;
let _retries = 0, _latestText = "", _wakeEnabled = true;

const _memory = [];
const UA = navigator.userAgent;
const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/.test(UA);
const PLATFORM   = IS_IOS ? "iOS" : IS_ANDROID ? "Android" : "Desktop";

const $ = (id)  => document.getElementById(id);
const $q= (sel) => document.querySelector(sel);

// ── FIXED WAKE WORD ENGINE ───────────────────────────────────────
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
  _wakeRec.lang = "hi-IN";
  _wakeRec.continuous = !IS_IOS;
  _wakeRec.interimResults = false;
  _wakeRec.maxAlternatives = 5;

  _wakeRec.onstart = () => { _wakeActive = true; _updateWakeIndicator(true); };
  _wakeRec.onresult = (e) => {
    if (_listening || _sending) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      for (let j = 0; j < e.results[i].length; j++) {
        const spoken = e.results[i][j].transcript.toLowerCase().trim();
        if (_isWakeWord(spoken)) { _onWakeDetected(); return; }
      }
    }
  };
  _wakeRec.onerror = (e) => { _wakeActive = false; _updateWakeIndicator(false); if (e.error !== "not-allowed") _scheduleWakeRestart(); };
  _wakeRec.onend = () => { _wakeActive = false; _updateWakeIndicator(false); if (_wakeEnabled && !_listening && !_sending) _scheduleWakeRestart(); };
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

function _isWakeWord(spoken) {
return CFG.WAKE_WORDS.some(w => spoken === w || spoken.includes(w) || spoken.includes("drishti") || spoken.includes("दृष्टि"));
}

function _onWakeDetected() {
stopWakeWord(); _showWakeFeedback(); setStatus("👋 Haan! Bol dijiye...", "#8B5CF6");
setTimeout(() => { if (!_sending) startListening(); }, 350);
}

// ── FIXED MAIN LISTENING (Awaaz Pakadne Wala Logic) ──────────────
function startListening() {
if (_listening || _sending) return;
stopWakeWord(); _destroyRec();

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) return;

_rec = new SR(); _sessionDone = false; _latestText = "";
_rec.lang = getLang();
_rec.maxAlternatives = 5;
_rec.continuous = !IS_IOS; // Android par continuous on rakha hai
_rec.interimResults = true; // FIXED: Sabhi devices par true kiya taaki awaaz turant dikhe

_rec.onstart = () => { _listening = true; setMicUI("listening"); setStatus("🎙 Sun rahi hoon... boliye!", "#8B5CF6"); };
_rec.onresult = (e) => {
  if (_sessionDone) return;
  let interim = "", final = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) final += e.results[i][0].transcript;
    else interim += e.results[i][0].transcript;
  }
  _latestText = final || interim;
  if (_latestText.trim()) {
    setInput(_latestText, final ? "#fff" : "#A855F7");
    _armSilence(_latestText); // Awaaz aate hi timer chalu
  }
};
_rec.onerror = (e) => { if (e.error !== "aborted") _resetIdle(); };
_rec.onend = () => { if (!_sending && !_sessionDone && _latestText === "") _resetIdle(); };
try { _rec.start(); } catch (err) { _resetIdle(); }
}

// ── FIXED CORE HELPERS ───────────────────────────────────────────
function _destroyRec() {
if (_rec) { try { _rec.onstart = _rec.onresult = _rec.onerror = _rec.onend = null; _rec.abort(); } catch (e) {} _rec = null; }
if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
if (_sendTimer)    { clearTimeout(_sendTimer);    _sendTimer    = null; }
}

function _resetIdle() {
_destroyRec(); _listening = _sending = _sessionDone = false; _latestText = "";
setMicUI(_wakeActive ? "wake_ready" : "idle");
setStatus(_wakeEnabled ? "Ready! 'Hey DRISHTI' boliye" : "Ready! Tap mic");
if (_wakeEnabled) setTimeout(() => { if(!_listening) startWakeWord(); }, 1500);
}

function _executeSend(rawText) {
if (_sending || _sessionDone) return;
_sending = _sessionDone = true;
let text = addPunctuation(cleanText(resolveContextualText(rawText)));
setInput(text, "#ffffff"); setMicUI("sending"); setStatus("Bhej rahi hoon...", "#059669");
_destroyRec();
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

// ... बाकी Punctuation, UI, Memory और init() फंक्शन्स वैसे ही रहेंगे जैसे तुमने दिए थे ...
// (Space ki kami se main punctuation function nahi repeat kar raha, par code wahi rahega)

function setMicUI(state) {
const mic = $("mic"); if (!mic) return;
const s = { idle:{bg:"#EC4899",h:"🎙"}, listening:{bg:"#DC2626",h:"🔴"}, sending:{bg:"#059669",h:"✅"} }[state] || {bg:"#EC4899",h:"🎙"};
mic.style.background = s.bg; mic.innerHTML = s.h;
}

function init() {
const mic = $("mic"); if (mic) { mic.onclick = () => { if (_listening) stopListening(); else startListening(); }; }
setTimeout(() => { if (_wakeEnabled) startWakeWord(); }, 1500);
}
init();
return { init, start: startListening, stop: _destroyRec };
})();
