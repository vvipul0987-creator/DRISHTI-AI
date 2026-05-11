// ════════════════════════════════════════════════════════════════════
// voice.js — DRISHTI Voice v8.0 (Original Base + Critical Fixes)
// ════════════════════════════════════════════════════════════════════

window.DrishtiVoice = (function () {
"use strict";

const CFG = {
  SILENCE_MS       : 1800, // सन्नाटा पकड़ने का सही समय
  SEND_DELAY_IOS   : 180,
  SEND_DELAY_OTHER : 320,
  WAKE_RESTART_MS  : 2000, // क्लिक लूप रोकने के लिए बढ़ा हुआ समय
  CONFIDENCE_MIN   : 0.4,  // हल्की आवाज़ पकड़ने के लिए
  WAKE_WORDS: [
    "hey drishti","hi drishti","hello drishti","drishti suno","hey dristi","हे दृष्टि"
  ],
};

let _rec = null, _wakeRec = null, _listening = false, _sending = false, _wakeActive = false;
let _sessionDone = false, _latestText = "", _wakeEnabled = true, _silenceTimer = null;

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const $ = (id) => document.getElementById(id);

// ── 🎯 आवाज़ पकड़ने वाला फिक्स्ड लॉजिक (Main Recognition) ──
function startListening() {
  if (_listening || _sending) return;
  stopWakeWord(); 
  _destroyRec(); // पुराने किसी भी लूप को मारो

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  _rec = new SR();
  _sessionDone = false;
  _latestText = "";
  _rec.lang = "hi-IN";
  _rec.interimResults = true; // इसे true ही रखना है ताकि आवाज़ तुरंत दिखे
  _rec.continuous = !IS_IOS;  // iPad पर false, बाकी जगह true (Stability के लिए)

  _rec.onstart = () => {
    _listening = true;
    setMicUI("listening");
    setStatus("🎙️ Sun rahi hoon... boliye!", "#8B5CF6");
  };

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
      _armSilence(_latestText); // आवाज़ आते ही सन्नाटा चेक करना शुरू
    }
  };

  _rec.onerror = (e) => { if (e.error !== "aborted") _resetIdle(); };
  _rec.onend = () => { if (!_sending && !_sessionDone && _latestText === "") _resetIdle(); };

  try { _rec.start(); } catch (err) { _resetIdle(); }
}

// ── 🛡️ वेक वर्ड इंजन (बिना क्लिक वाली आवाज़ के) ──
function startWakeWord() {
  if (!_wakeEnabled || _listening || _sending || _wakeActive) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  if (_wakeRec) _destroyWake(); // Cleanup before start

  _wakeRec = new SR();
  _wakeRec.lang = "hi-IN";
  _wakeRec.continuous = false;
  _wakeRec.interimResults = false;

  _wakeRec.onstart = () => { _wakeActive = true; _updateWakeIndicator(true); };
  _wakeRec.onresult = (e) => {
    const spoken = e.results[0][0].transcript.toLowerCase();
    if (CFG.WAKE_WORDS.some(w => spoken.includes(w))) {
      _onWakeDetected();
    }
  };
  _wakeRec.onerror = () => { _wakeActive = false; _scheduleWakeRestart(); };
  _wakeRec.onend = () => { _wakeActive = false; _updateWakeIndicator(false); if (!_listening) _scheduleWakeRestart(); };
  
  try { _wakeRec.start(); } catch(e) { _wakeActive = false; }
}

// ── ⚙️ बैकएंड फंक्शन्स (वही पुराने वाले) ──
function _destroyRec() {
  if (_rec) { try { _rec.onstart=_rec.onresult=_rec.onerror=_rec.onend=null; _rec.abort(); } catch(e){} _rec = null; }
  if (_silenceTimer) clearTimeout(_silenceTimer);
}

function _destroyWake() {
  if (_wakeRec) { try { _wakeRec.onstart=_wakeRec.onresult=_wakeRec.onerror=_wakeRec.onend=null; _wakeRec.abort(); } catch(e){} _wakeRec = null; }
}

function _resetIdle() {
  _destroyRec(); _destroyWake();
  _listening = _sending = _sessionDone = false;
  setMicUI("idle");
  setStatus(_wakeEnabled ? "Ready! 'Hey DRISHTI' boliye" : "Ready! Tap mic");
  if (_wakeEnabled) setTimeout(startWakeWord, 1500);
}

function _executeSend(rawText) {
  if (_sending || _sessionDone) return;
  _sending = _sessionDone = true;
  _destroyRec();
  setInput(rawText, "#ffffff");
  setMicUI("sending");
  setTimeout(() => {
    if (window.send) window.send();
    setTimeout(_resetIdle, 1000);
  }, IS_IOS ? CFG.SEND_DELAY_IOS : CFG.SEND_DELAY_OTHER);
}

function _armSilence(text) {
  if (_silenceTimer) clearTimeout(_silenceTimer);
  if (!text || _sessionDone) return;
  _silenceTimer = setTimeout(() => { if (!_sessionDone && _latestText.trim()) _executeSend(_latestText); }, CFG.SILENCE_MS);
}

// ── UI और Helpers ──
function setMicUI(state) {
  const mic = $("mic"); if (!mic) return;
  const s = { idle:{bg:"#EC4899",h:"🎙"}, listening:{bg:"#DC2626",h:"🔴"}, sending:{bg:"#059669",h:"✅"} }[state] || {bg:"#EC4899",h:"🎙"};
  mic.style.background = s.bg; mic.innerHTML = s.h;
}

function setStatus(m, c) { const s = $("sbar"); if(s){ s.textContent=m; s.style.color=c; } }
function setInput(v, c) { const i = $("inp"); if(i){ i.value=v; i.style.color=c; } }
function stopWakeWord() { _destroyWake(); _wakeActive = false; }
function _scheduleWakeRestart() { setTimeout(() => { if(!_listening && !_wakeActive) startWakeWord(); }, CFG.WAKE_RESTART_MS); }
function _onWakeDetected() { stopWakeWord(); setStatus("👋 Haan!", "#8B5CF6"); setTimeout(startListening, 400); }
function _updateWakeIndicator(a) { /* indicator logic */ }

function init() {
  const mic = $("mic");
  if (mic) mic.onclick = () => { if(_listening) _resetIdle(); else startListening(); };
  setTimeout(startWakeWord, 1500);
}

init();
return { init, start: startListening, stop: _destroyRec };

})();
