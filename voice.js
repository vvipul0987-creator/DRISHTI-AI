// ════════════════════════════════════════════════════════════════════
// voice.js  —  DRISHTI Voice System  v8.0
//
//  ✅ “Hey DRISHTI” Wake Word  — Android + Desktop (always)
//  ✅ “Hey DRISHTI” Wake Word  — iPhone/iPad (screen active hone par)
//  ✅ iPad Safari  ✅ iPhone Safari  ✅ Android Chrome  ✅ Desktop
//  ✅ Hindi  ✅ English  ✅ Hinglish  — auto detect
//  ✅ Gemini-style: tap → speak → silence → auto send → mic off
//  ✅ Smart Punctuation
//  ✅ Retry “Galat tha” button
//  ✅ Voice Context Memory
//  ✅ Private Analytics
//  ✅ Instant Send Mode
//  ✅ Chat auto-scroll
//  ✅ Zero double-send, zero loops, zero crashes
// ════════════════════════════════════════════════════════════════════

window.DrishtiVoice = (function () {
“use strict”;

// ── Config ──────────────────────────────────────────────────────
const CFG = {
SILENCE_MS       : 1600,
SEND_DELAY_IOS   : 180,
SEND_DELAY_OTHER : 320,
MAX_RETRY        : 2,
CONFIDENCE_MIN   : 0.52,
HISTORY_MAX      : 8,
WAKE_RESTART_MS  : 1200,  // Wake word listener restart delay
INSTANT_SEND_KEY : “drishti_instant_send”,
ANALYTICS_KEY    : “drishti_voice_stats”,

```
// Wake word variations — jo bhi bolo DRISHTI sunegi
WAKE_WORDS: [
  "hey drishti","hi drishti","hello drishti",
  "aye drishti","o drishti","drishti sun",
  "drishti suno","okay drishti","ok drishti",
  "हे दृष्टि","दृष्टि सुनो","दृष्टि","हेलो दृष्टि",
  "hey dristi","hey drishty","hey drishtti", // common mispronunciations
],
```

};

// ── State ────────────────────────────────────────────────────────
let _rec          = null;   // Main recognition
let _wakeRec      = null;   // Wake word recognition (separate)
let _listening    = false;
let _sending      = false;
let _wakeActive   = false;
let _sessionDone  = false;
let _sendTimer    = null;
let _silenceTimer = null;
let _wakeTimer    = null;   // Wake restart timer
let _retries      = 0;
let _latestText   = “”;
let _wakeEnabled  = true;   // User toggle kar sakta hai

const _memory = [];

// ── Device detect ────────────────────────────────────────────────
const UA         = navigator.userAgent;
const IS_IOS     = /iPad|iPhone|iPod/.test(UA) ||
(navigator.platform === “MacIntel” && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/.test(UA);
const PLATFORM   = IS_IOS ? “iOS” : IS_ANDROID ? “Android” : “Desktop”;

const $ = (id)  => document.getElementById(id);
const $q= (sel) => document.querySelector(sel);

// ════════════════════════════════════════════════════════════════
// WAKE WORD ENGINE
// ════════════════════════════════════════════════════════════════

function startWakeWord() {
if (!_wakeEnabled)            return;
if (_wakeActive)              return;
if (_listening || _sending)   return;

```
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) return;

// iOS: wake word works only when screen/tab is active
// We still start it — it will work when app is in foreground
if (IS_IOS) {
  console.log("[DRISHTI] Wake word: iOS mode — works when screen active");
}

try {
  _wakeRec = new SR();

  // Wake word settings — lightweight, battery friendly
  _wakeRec.lang            = "hi-IN";  // Hindi + English both picked up
  _wakeRec.continuous      = !IS_IOS;  // iOS: continuous crashes — use false
  _wakeRec.interimResults  = false;    // No interim for wake — save battery
  _wakeRec.maxAlternatives = 5;        // More alternatives = better detection

  _wakeRec.onstart = () => {
    _wakeActive = true;
    console.log("[DRISHTI] Wake word listening... say 'Hey DRISHTI'");
    _updateWakeIndicator(true);
  };

  _wakeRec.onresult = (e) => {
    if (_listening || _sending) return;

    for (let i = e.resultIndex; i < e.results.length; i++) {
      // Check ALL alternatives — better chance of catching "Hey DRISHTI"
      for (let j = 0; j < e.results[i].length; j++) {
        const spoken = e.results[i][j].transcript.toLowerCase().trim();
        console.log("[DRISHTI] Wake heard:", spoken);

        if (_isWakeWord(spoken)) {
          console.log("[DRISHTI] WAKE WORD MATCHED:", spoken);
          _onWakeDetected();
          return;
        }
      }
    }
  };

  _wakeRec.onerror = (e) => {
    _wakeActive = false;
    _updateWakeIndicator(false);

    if (e.error === "aborted" || e.error === "no-speech") {
      // Normal — restart
      _scheduleWakeRestart();
      return;
    }

    if (e.error === "not-allowed" || e.error === "permission-denied") {
      console.warn("[DRISHTI] Wake word: mic permission denied");
      _wakeEnabled = false; // Band karo — permission nahi hai
      return;
    }

    // Other errors — restart after delay
    _scheduleWakeRestart();
  };

  _wakeRec.onend = () => {
    _wakeActive = false;
    _updateWakeIndicator(false);
    // Auto-restart agar main listening nahi chal raha
    if (_wakeEnabled && !_listening && !_sending) {
      _scheduleWakeRestart();
    }
  };

  _wakeRec.start();

} catch (err) {
  console.warn("[DRISHTI] Wake word start error:", err.name);
  _wakeActive = false;
  _scheduleWakeRestart();
}
```

}

function stopWakeWord() {
if (_wakeTimer) { clearTimeout(_wakeTimer); _wakeTimer = null; }
if (_wakeRec) {
try { _wakeRec.abort(); } catch (e) {}
_wakeRec = null;
}
_wakeActive = false;
_updateWakeIndicator(false);
}

function _scheduleWakeRestart() {
if (_wakeTimer) return;
_wakeTimer = setTimeout(() => {
_wakeTimer = null;
if (_wakeEnabled && !_listening && !_sending) {
startWakeWord();
}
}, CFG.WAKE_RESTART_MS);
}

// Check if spoken text matches any wake word
function _isWakeWord(spoken) {
return CFG.WAKE_WORDS.some(w => {
// Exact match
if (spoken === w) return true;
// Contains match (user might say extra words)
if (spoken.includes(w)) return true;
// Fuzzy: “drishti” anywhere in speech
if (spoken.includes(“drishti”) || spoken.includes(“दृष्टि”)) return true;
return false;
});
}

// Wake word detected → start main listening
function _onWakeDetected() {
stopWakeWord(); // Wake listener band karo

```
// Visual + audio feedback
_showWakeFeedback();
setStatus("👋 Haan! Bol dijiye...", "#8B5CF6");

// Small delay (feels natural like Siri)
setTimeout(() => {
  if (!_sending) startListening();
}, 350);
```

}

// Wake word visual feedback — like Siri’s animation
function _showWakeFeedback() {
const mic = $(“mic”);
if (!mic) return;

```
// Purple flash — "I heard you"
mic.style.background = "#7C3AED";
mic.style.boxShadow  = "0 0 25px #7C3AED88";
mic.innerHTML        = "👁️";

setTimeout(() => {
  mic.style.background = "#DC2626";
  mic.style.boxShadow  = "";
  mic.innerHTML        = "🔴";
}, 500);
```

}

// Small wake indicator dot near mic
function _updateWakeIndicator(active) {
let dot = $(“drishti-wake-dot”);
if (!dot) {
dot = document.createElement(“span”);
dot.id = “drishti-wake-dot”;
dot.style.cssText = `position:absolute; top:-4px; right:-4px; width:8px; height:8px; border-radius:50%; transition: all 0.3s; pointer-events:none;`;
const mic = $(“mic”);
if (mic) {
if (getComputedStyle(mic.parentNode).position === “static”) {
mic.parentNode.style.position = “relative”;
}
mic.parentNode.appendChild(dot);
}
}

```
if (active && _wakeEnabled) {
  dot.style.background = "#22C55E"; // Green = wake listening
  dot.title = "Wake word active — 'Hey DRISHTI' boliye";
} else {
  dot.style.background = "#374151"; // Gray = inactive
  dot.title = "Wake word inactive";
}
```

}

// Wake word ON/OFF toggle button
function _injectWakeToggle() {
if ($(“drishti-wake-toggle”)) return;
const mic = $(“mic”);
if (!mic || !mic.parentNode) return;

```
const btn = document.createElement("button");
btn.id = "drishti-wake-toggle";
btn.style.cssText = `
  position:absolute; top:-26px; left:0;
  background:transparent; font-size:11px; padding:2px 8px;
  border-radius:10px; cursor:pointer; font-family:inherit;
  transition:all 0.2s; white-space:nowrap;
`;
_updateWakeToggleBtn(btn, _wakeEnabled);

btn.addEventListener("click", (e) => {
  e.stopPropagation();
  _wakeEnabled = !_wakeEnabled;
  _updateWakeToggleBtn(btn, _wakeEnabled);

  if (_wakeEnabled) {
    setStatus("🟢 Wake word ON — 'Hey DRISHTI' boliye!", "#22C55E");
    setTimeout(startWakeWord, 300);
  } else {
    stopWakeWord();
    setStatus("Wake word OFF — manually mic tap karo", "#6B7280");
  }
});

const p = mic.parentNode;
if (getComputedStyle(p).position === "static") p.style.position = "relative";
p.appendChild(btn);
```

}

function _updateWakeToggleBtn(btn, on) {
btn.textContent = on ? “🟢 Hey DRISHTI” : “⚫ Wake OFF”;
btn.style.color  = on ? “#22C55E” : “#6B7280”;
btn.style.border = on ? “1px solid #22C55E55” : “1px solid #37415155”;
btn.title        = on ? “Wake word ON — tap to disable”
: “Wake word OFF — tap to enable”;
}

// ════════════════════════════════════════════════════════════════
// INNOVATION 1 — Smart Punctuation
// ════════════════════════════════════════════════════════════════
function addPunctuation(text) {
if (!text || !text.trim()) return text;
let t = text.trim();
if (/[.?!\u0964\u0965]$/.test(t)) return t;

```
const lower = t.toLowerCase();
const qWords = [
  "क्या","कैसे","कहाँ","कब","क्यों","कौन","कितना","kya","kaise",
  "kahan","kab","kyun","kaun","kitna","what","how","where","when",
  "why","who","which","is","are","was","were","do","does","did",
  "can","could","will","would","should","have","has",
];
const exWords = [
  "wah","shabash","bahut acha","great","awesome","bilkul",
  "zaroor","band karo","stop","yes","haan",
];

const startsQ = qWords.some(w => lower.startsWith(w));
const hasQ    = lower.includes("?") || lower.endsWith("kya");

if (startsQ || hasQ) return t + "?";
if (exWords.some(w => lower.includes(w))) return t + "!";

return t + (/[\u0900-\u097F]/.test(t) ? "।" : ".");
```

}

// ════════════════════════════════════════════════════════════════
// INNOVATION 2 — Retry “Galat tha” button
// ════════════════════════════════════════════════════════════════
function showRetryButton(lastText) {
const old = $(“drishti-retry-btn”);
if (old) old.remove();

```
const btn = document.createElement("button");
btn.id = "drishti-retry-btn";
btn.textContent = "🔄  Galat tha — dobara bolo";
btn.style.cssText = `
  position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
  background:#1E293B; color:#F59E0B; border:1px solid #F59E0B;
  border-radius:20px; padding:8px 18px; font-size:13px;
  cursor:pointer; z-index:9999; font-family:inherit;
  box-shadow:0 4px 15px #00000055;
  animation:drishti-fadein 0.3s ease;
`;
btn.onclick = () => {
  btn.remove();
  const inp = $("inp");
  if (inp) inp.value = "";
  if (lastText) _memory.push({ text: lastText, wasRetried: true });
  startListening();
};
document.body.appendChild(btn);
setTimeout(() => { if (btn.parentNode) btn.remove(); }, 5000);
```

}

// ════════════════════════════════════════════════════════════════
// INNOVATION 3 — Voice Context Memory
// ════════════════════════════════════════════════════════════════
function saveToMemory(text) {
if (!text || !text.trim()) return;
_memory.push({ text: text.trim(), time: Date.now() });
if (_memory.length > CFG.HISTORY_MAX) _memory.shift();
}

function resolveContextualText(text) {
const lower = text.toLowerCase().trim();
const triggers = [
“wahi bhejo”,“dobara bhejo”,“same bhejo”,“phir se bhejo”,
“wahi wala”,“repeat karo”,“send that again”,“same again”,“repeat that”,
];
if (triggers.some(t => lower.includes(t))) {
for (let i = _memory.length - 1; i >= 0; i–) {
if (!_memory[i].wasRetried) {
setStatus(“Memory se: "” + _memory[i].text + “"”, “#8B5CF6”);
return _memory[i].text;
}
}
}
return text;
}

// ════════════════════════════════════════════════════════════════
// INNOVATION 4 — Private Voice Analytics
// ════════════════════════════════════════════════════════════════
const _analytics = (function () {
const load = () => {
try { return JSON.parse(localStorage.getItem(CFG.ANALYTICS_KEY) || “{}”); }
catch (e) { return {}; }
};
const save = (d) => {
try { localStorage.setItem(CFG.ANALYTICS_KEY, JSON.stringify(d)); }
catch (e) {}
};
return {
record(lang, ok) {
const d = load();
d.total   = (d.total   || 0) + 1;
d.success = (d.success || 0) + (ok ? 1 : 0);
d[lang]   = (d[lang]   || 0) + 1;
d.lastUsed = new Date().toISOString();
save(d);
},
preferredLang() {
const d = load();
const hi = d[“hi-IN”] || 0, en = d[“en-IN”] || 0;
if (!hi && !en) return null;
return hi >= en ? “hi-IN” : “en-IN”;
},
getStats() { return load(); },
};
})();

// ════════════════════════════════════════════════════════════════
// INNOVATION 5 — Instant Send Mode
// ════════════════════════════════════════════════════════════════
const isInstant = () => {
try { return localStorage.getItem(CFG.INSTANT_SEND_KEY) === “true”; }
catch (e) { return false; }
};
const toggleInstant = () => {
const next = !isInstant();
try { localStorage.setItem(CFG.INSTANT_SEND_KEY, String(next)); }
catch (e) {}
const btn = $(“drishti-instant-btn”);
if (btn) _updateInstantBtn(btn, next);
setStatus(next ? “⚡ Instant mode ON” : “Normal speed mode”, next ? “#F59E0B” : “#6B7280”);
};
const _updateInstantBtn = (btn, on) => {
btn.textContent = on ? “⚡ Instant” : “🕐 Normal”;
btn.style.color  = on ? “#F59E0B” : “#9CA3AF”;
btn.style.border = on ? “1px solid #F59E0B55” : “1px solid #37415155”;
};
function _injectInstantToggle() {
if ($(“drishti-instant-btn”)) return;
const mic = $(“mic”);
if (!mic || !mic.parentNode) return;
const btn = document.createElement(“button”);
btn.id = “drishti-instant-btn”;
btn.style.cssText = `position:absolute; top:-26px; right:0; background:transparent; font-size:11px; padding:2px 7px; border-radius:10px; cursor:pointer; font-family:inherit; transition:all 0.2s;`;
_updateInstantBtn(btn, isInstant());
btn.onclick = (e) => { e.stopPropagation(); toggleInstant(); };
const p = mic.parentNode;
if (getComputedStyle(p).position === “static”) p.style.position = “relative”;
p.appendChild(btn);
}

// ════════════════════════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════════════════════════
function _injectCSS() {
if ($(“drishti-v8-css”)) return;
const s   = document.createElement(“style”);
s.id      = “drishti-v8-css”;
s.textContent = `@keyframes drishti-pulse { 0%,100% { box-shadow:0 0 0  0px #DC262666; } 50%      { box-shadow:0 0 0 14px #DC262622; } } @keyframes drishti-fadein { from { opacity:0; transform:translateX(-50%) translateY(8px); } to   { opacity:1; transform:translateX(-50%) translateY(0);   } } @keyframes drishti-wake-glow { 0%,100% { box-shadow:0 0 0  0px #22C55E44; } 50%      { box-shadow:0 0 0 10px #22C55E11; } } #mic { transition:background 0.2s, box-shadow 0.2s; }`;
document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════════════
// CORE HELPERS
// ════════════════════════════════════════════════════════════════
function setStatus(msg, color) {
const el = $(“sbar”);
if (!el) return;
el.textContent = msg;
el.style.color  = color || “#6B7280”;
}
function setInput(val, color) {
const el = $(“inp”);
if (!el) return;
el.value = val;
if (color) el.style.color = color;
}

const MIC_STATES = {
idle       : { bg:”#EC4899”, sh:“none”,               html:“🎙”, anim:“none” },
wake_ready : { bg:”#065F46”, sh:“0 0 10px #22C55E44”, html:“🎙”, anim:“drishti-wake-glow 2s infinite” },
listening  : { bg:”#DC2626”, sh:””,                   html:“🔴”, anim:“drishti-pulse 1.2s infinite”  },
processing : { bg:”#D97706”, sh:“0 0 12px #D9770655”, html:“⏳”, anim:“none” },
sending    : { bg:”#059669”, sh:“0 0 12px #05966955”, html:“✅”, anim:“none” },
wake_heard : { bg:”#7C3AED”, sh:“0 0 25px #7C3AED88”, html:“👁️”,anim:“none” },
};

function setMicUI(state) {
const mic = $(“mic”);
if (!mic) return;
const s = MIC_STATES[state] || MIC_STATES.idle;
mic.style.background = s.bg;
mic.style.boxShadow  = s.sh;
mic.innerHTML        = s.html;
mic.style.animation  = s.anim;
}

function scrollToBottom() {
const el = $(“chat”) || $(“messages”) || $(“chatbox”) ||
$(“chat-container”) || $(“msg-container”) ||
$q(”.chat-messages”) || $q(”.messages”) ||
$q(”.chat-body”)     || $q(”.chat-area”);
if (el) el.scrollTo({ top: el.scrollHeight, behavior: “smooth” });
else    window.scrollTo({ top: document.body.scrollHeight, behavior: “smooth” });
}

function getLang() {
if (window.DrishtiLang) {
if (window.DrishtiLang.current === “english”) return “en-IN”;
if (window.DrishtiLang.current === “hindi”)   return “hi-IN”;
}
return _analytics.preferredLang() || “hi-IN”;
}

function cleanText(text) {
let t = text.trim().replace(/\s+/g, “ “);
const fixes = {
“python”:“Python”,“javascript”:“JavaScript”,“java script”:“JavaScript”,
“html”:“HTML”,“css”:“CSS”,“ai”:“AI”,“api”:“API”,“url”:“URL”,
“upi”:“UPI”,“drishti”:“DRISHTI”,“vercel”:“Vercel”,“github”:“GitHub”,
};
Object.entries(fixes).forEach(([w,r]) => {
t = t.replace(new RegExp(”\b” + w + “\b”, “gi”), r);
});
if (/^[a-zA-Z]/.test(t)) t = t[0].toUpperCase() + t.slice(1);
return t;
}

// ════════════════════════════════════════════════════════════════
// CORE: Recognition lifecycle
// ════════════════════════════════════════════════════════════════
function _destroyRec() {
if (_rec) { try { _rec.abort(); } catch (e) {} _rec = null; }
if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
if (_sendTimer)    { clearTimeout(_sendTimer);    _sendTimer    = null; }
}

function _resetIdle() {
_destroyRec();
_listening = _sending = _sessionDone = false;
_latestText = “”;
setMicUI(_wakeActive ? “wake_ready” : “idle”);
setStatus(
_wakeEnabled
? “Ready!  Tap mic ya ‘Hey DRISHTI’ boliye”
: “Ready!  Tap mic ya type karo”
);
// Wake word restart after main listening
if (_wakeEnabled && !_wakeActive) {
setTimeout(startWakeWord, 500);
}
}

function _executeSend(rawText) {
if (_sending || _sessionDone) return;
_sending = _sessionDone = true;

```
let text = cleanText(rawText);
text = resolveContextualText(text);
text = addPunctuation(text);

const lang = /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";

setInput(text, "#ffffff");
setMicUI("sending");
setStatus("Bhej rahi hoon...", "#059669");

_destroyRec();
_listening = false;
_analytics.record(lang, true);
saveToMemory(text);

_sendTimer = setTimeout(() => {
  _sendTimer = null;
  if (window.send) window.send();
  setTimeout(scrollToBottom, 150);
  setTimeout(() => showRetryButton(text), 500);
  setTimeout(_resetIdle, 700);
}, IS_IOS ? CFG.SEND_DELAY_IOS : CFG.SEND_DELAY_OTHER);
```

}

function _armSilence(text) {
if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
if (!text || !text.trim() || _sessionDone) return;

```
if (isInstant()) { _executeSend(text); return; }

_silenceTimer = setTimeout(() => {
  _silenceTimer = null;
  if (!_sessionDone && _latestText.trim()) _executeSend(_latestText);
}, CFG.SILENCE_MS);
```

}

// ════════════════════════════════════════════════════════════════
// CORE: Start main listening
// ════════════════════════════════════════════════════════════════
function startListening() {
if (_listening || _sending) return;

```
// Stop wake word while main listening
stopWakeWord();

const SR = window.SpeechRecognition      ||
           window.webkitSpeechRecognition ||
           window.mozSpeechRecognition    ||
           window.msSpeechRecognition;
if (!SR) {
  setStatus(
    "⚠️ " + (IS_IOS ? "Settings › Safari › Mic › Allow karo"
            : IS_ANDROID ? "Chrome › Site Settings › Mic › Allow"
                         : "Browser mein Mic allow karo"),
    "#DC2626"
  );
  return;
}

_destroyRec();
_rec = new SR();
_sessionDone = false;
_latestText  = "";

_rec.lang            = getLang();
_rec.maxAlternatives = 5;
_rec.continuous      = false;
_rec.interimResults  = !IS_IOS;

_rec.onstart = () => {
  _listening = true;
  setMicUI("listening");
  setStatus(
    "🎙 Sun rahi hoon" + (isInstant() ? " ⚡" : "") + "... boliye!",
    "#8B5CF6"
  );
};

_rec.onspeechstart = () => {
  if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
  setStatus("🎙 Awaaz aa rahi hai...", "#8B5CF6");
};

_rec.onspeechend = () => {
  setMicUI("processing");
  setStatus("⏳ Samajh rahi hoon...", "#D97706");
  if (_latestText && !_sessionDone) _armSilence(_latestText);
};

_rec.onresult = (e) => {
  if (_sessionDone) return;
  let interim = "", final = "";

  for (let i = e.resultIndex; i < e.results.length; i++) {
    const res  = e.results[i];
    const txt  = res[0].transcript;
    const conf = res[0].confidence;

    if (res.isFinal) {
      if (!IS_IOS && typeof conf === "number"
          && conf < CFG.CONFIDENCE_MIN && txt.trim().length < 5) continue;
      final += txt;
    } else {
      interim += txt;
    }
  }

  if (interim) {
    _latestText = interim;
    setInput(interim, "#A855F7");
    setStatus("🎙 Sun rahi hoon...", "#8B5CF6");
    _armSilence(interim);
  }
  if (final) {
    if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
    _latestText = final;
    setInput(cleanText(final), "#ffffff");
    setStatus("Suna: \"" + cleanText(final) + "\" ✅", "#059669");
    setMicUI("processing");
    _retries = 0;
    _executeSend(final);
  }
};

_rec.onerror = (e) => {
  if (e.error === "aborted") return;
  switch (e.error) {
    case "no-speech":
      if (_retries < CFG.MAX_RETRY && !_sending) {
        _retries++;
        setStatus("Sunai nahi diya, dobara boliye (" + _retries + "/" + CFG.MAX_RETRY + ")", "#D97706");
        _destroyRec();
        setTimeout(() => { if (!_sending) startListening(); }, 900);
      } else {
        _retries = 0;
        _analytics.record(getLang(), false);
        setStatus("Mic ke paas clearly boliye!", "#DC2626");
        setTimeout(_resetIdle, 2500);
      }
      break;
    case "not-allowed": case "permission-denied":
      setStatus("⚠️ " + (IS_IOS ? "Settings › Safari › Mic › Allow"
                : IS_ANDROID ? "Chrome › Site Settings › Mic › Allow"
                             : "Browser mein Mic allow karo"), "#DC2626");
      _wakeEnabled = false; // Permission nahi toh wake bhi band
      _resetIdle(); break;
    case "network":
      setStatus("⚠️ Internet check karo!", "#DC2626"); _resetIdle(); break;
    case "audio-capture":
      setStatus("⚠️ Mic nahi mili", "#DC2626"); _resetIdle(); break;
    default:
      setStatus("⚠️ Error: " + e.error, "#DC2626");
      setTimeout(_resetIdle, 2000);
  }
};

// onend — ZERO SEND
_rec.onend = () => {
  if (!_sessionDone && _latestText.trim()) {
    setMicUI("processing");
    return; // Silence timer chal raha hai
  }
  if (!_sending && !_sessionDone) _resetIdle();
};

try {
  _rec.start();
} catch (err) {
  if (err.name === "InvalidStateError") {
    _destroyRec();
    setTimeout(startListening, 700);
  } else {
    _resetIdle();
  }
}
```

}

function stopListening() {
if (_rec) { try { _rec.stop(); } catch (e) {} }
if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
_listening = false;
setMicUI(“idle”);
setStatus(“Ready!  Tap mic ya ‘Hey DRISHTI’ boliye”);
// Wake word restart
if (_wakeEnabled) setTimeout(startWakeWord, 600);
}

// ── Toggle ───────────────────────────────────────────────────────
let _lastTap = 0;
function toggle() {
const now = Date.now();
if (now - _lastTap < 350) return;
_lastTap = now;
if (_sending)   return;
if (_listening) stopListening();
else { stopWakeWord(); startListening(); }
}

// ── iOS unlock ───────────────────────────────────────────────────
function _unlockIOS() {
const h = () => {
try {
const Ctx = window.AudioContext || window.webkitAudioContext;
if (Ctx) { const c = new Ctx(); c.resume().then(() => c.close()); }
if (window.speechSynthesis) speechSynthesis.resume();
} catch (e) {}
document.removeEventListener(“touchstart”, h);
document.removeEventListener(“touchend”,   h);
};
document.addEventListener(“touchstart”, h, { passive: true });
document.addEventListener(“touchend”,   h, { passive: true });
}

// ════════════════════════════════════════════════════════════════
// PUBLIC: init
// ════════════════════════════════════════════════════════════════
function init() {
console.log(
“%c DRISHTI Voice v8.0 — Hey DRISHTI Ready! “,
“background:#7C3AED;color:#fff;padding:4px 8px;border-radius:4px;”,
“| Platform:”, PLATFORM
);

```
_injectCSS();
if (IS_IOS) _unlockIOS();

// Mic button
const mic = $("mic");
if (mic) {
  mic.removeAttribute("onclick");
  let _lt = 0;
  const _tap = () => {
    const n = Date.now();
    if (n - _lt < 350) return;
    _lt = n; toggle();
  };
  mic.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); _tap(); }, { passive:false });
  mic.addEventListener("click",    (e) => { e.preventDefault(); _tap(); });
}

// Keyboard
const inp = $("inp");
if (inp) {
  inp.addEventListener("keydown", (e) => {
    if (_sendTimer) { clearTimeout(_sendTimer); _sendTimer = null; }
    if (e.key === "Enter" && !e.shiftKey) setTimeout(scrollToBottom, 200);
  });
}

// Patch window.send for auto-scroll
const _orig = window.send;
window.send = function () {
  if (_orig) _orig.apply(this, arguments);
  setTimeout(scrollToBottom, 200);
};

// UI buttons
setTimeout(() => {
  _injectWakeToggle();    // "Hey DRISHTI" toggle
  _injectInstantToggle(); // Instant send toggle
}, 600);

// Start wake word
setTimeout(() => {
  if (_wakeEnabled) startWakeWord();
}, 1500);

setMicUI("idle");
setStatus("Ready!  Tap mic ya 'Hey DRISHTI' boliye");
console.log("[DRISHTI] Analytics:", _analytics.getStats());
```

}

// Auto-init
if (document.readyState === “loading”) {
document.addEventListener(“DOMContentLoaded”, init);
} else {
init();
}

// ── Public API ───────────────────────────────────────────────────
return {
init,
toggle,
start           : startListening,
stop            : stopListening,
reset           : _resetIdle,
startWakeWord,
stopWakeWord,
scrollDown      : scrollToBottom,
getStats        : () => _analytics.getStats(),
getMemory       : () => […_memory],
get isListening()  { return _listening;  },
get isSending()    { return _sending;    },
get isWakeActive() { return _wakeActive; },
};

})();
