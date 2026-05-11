// voice.js — DRISHTI Voice v5.0 FINAL
// iPad + iPhone + Android — Hamesha Kaam Kare

window.DrishtiVoice = (function() {
  
  // ── STATE ──
  let SR = null;
  let mainRec = null;
  let wakeRec = null;
  let isMain = false;
  let isWake = false;
  let isSending = false;
  let hasResult = false;
  let wakeTimer = null;
  let restartTimer = null;

  // ── DEVICE DETECT ──
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_ANDROID = /android/i.test(navigator.userAgent);
  const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const HAS_SR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── HELPERS ──
  function getSR() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function getLang() {
    return (window.DrishtiLang && window.DrishtiLang.current === "english") 
      ? "en-US" : "hi-IN";
  }

  function setStatus(msg, color) {
    const s = document.getElementById("sbar");
    if(!s) return;
    s.textContent = msg;
    s.style.color = color || "#4B5563";
    if(color === "#DC2626") {
      setTimeout(() => {
        s.textContent = "Ready! 'Hey DRISHTI' bolo ya 🎙 tap karo";
        s.style.color = "#4B5563";
      }, 3000);
    }
  }

  function setMicUI(state) {
    const mic = document.getElementById("mic");
    if(!mic) return;
    const states = {
      off:  { bg: "#EC4899", shadow: "none", icon: "🎙" },
      wake: { bg: "#F59E0B", shadow: "0 0 20px #F59E0B88", icon: "✨" },
      on:   { bg: "#DC2626", shadow: "0 0 20px #DC262688", icon: "🔴" },
      send: { bg: "#059669", shadow: "0 0 20px #05996988", icon: "⏳" }
    };
    const s = states[state] || states.off;
    mic.style.background = s.bg;
    mic.style.boxShadow = s.shadow;
    mic.innerHTML = s.icon;
  }

  function vibrate() {
    try { if(navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch(e) {}
  }

  function killRec(rec) {
    if(!rec) return null;
    try { rec.onstart = rec.onresult = rec.onerror = rec.onend = null; } catch(e) {}
    try { rec.abort(); } catch(e) {}
    return null;
  }

  // ── WAKE WORD ──
  function startWake() {
    clearTimeout(wakeTimer);
    if(isMain || isWake || isSending) return;
    
    const S = getSR();
    if(!S) return;

    // iOS: user ne page touch kiya ho tab hi wake chalega
    if(IS_IOS && !window._drishtiUserInteracted) return;

    try {
      wakeRec = new S();
      wakeRec.lang = "hi-IN";
      wakeRec.continuous = true;
      wakeRec.interimResults = true;
      wakeRec.maxAlternatives = 1;

      wakeRec.onresult = function(e) {
        if(isMain) return;
        for(let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript.toLowerCase();
          if(t.includes("drishti") || t.includes("dristi") || 
             t.includes("दृष्टि") || t.includes("drishthi")) {
            onWake();
            return;
          }
        }
      };

      wakeRec.onend = function() {
        isWake = false;
        wakeRec = null;
        if(!isMain && !isSending) {
          wakeTimer = setTimeout(startWake, 800);
        }
      };

      wakeRec.onerror = function(e) {
        isWake = false;
        wakeRec = null;
        if(e.error !== "not-allowed" && e.error !== "aborted") {
          wakeTimer = setTimeout(startWake, 1500);
        }
      };

      wakeRec.start();
      isWake = true;

    } catch(e) {
      isWake = false;
      wakeTimer = setTimeout(startWake, 2000);
    }
  }

  function stopWake() {
    clearTimeout(wakeTimer);
    wakeRec = killRec(wakeRec);
    isWake = false;
  }

  function onWake() {
    if(isMain) return;
    stopWake();
    vibrate();
    setMicUI("wake");
    setStatus("👋 Hey! Boliye DRISHTI sun rahi hai...", "#F59E0B");
    setTimeout(() => startMain(), 600);
  }

  // ── MAIN RECOGNITION ──
  function startMain() {
    if(isMain || isSending) return;
    stopWake();

    const S = getSR();
    if(!S) {
      setStatus("Chrome ya Safari use karo!", "#DC2626");
      return;
    }

    mainRec = killRec(mainRec);
    hasResult = false;

    try {
      mainRec = new S();
      mainRec.lang = getLang();
      mainRec.continuous = false;
      mainRec.interimResults = !IS_IOS; // iOS mein interim nahi
      mainRec.maxAlternatives = IS_IOS ? 1 : 3;

      mainRec.onstart = function() {
        isMain = true;
        setMicUI("on");
        setStatus("🎙 Sun rahi hoon... boliye!", "#A855F7");
      };

      mainRec.onresult = function(e) {
        if(hasResult) return;

        let interim = "";
        let final = "";

        for(let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if(e.results[i].isFinal) final += t;
          else interim += t;
        }

        const inp = document.getElementById("inp");
        if(!inp) return;

        // Preview
        if(interim) {
          inp.value = interim;
          inp.style.color = "#A855F7";
        }

        // Final
        if(final) {
          hasResult = true;
          // Wake word filter karo
          const clean = final.trim()
            .replace(/hey drishti/gi, "")
            .replace(/drishti/gi, "")
            .replace(/दृष्टि/g, "")
            .trim();

          const msg = clean || final.trim();
          inp.value = msg;
          inp.style.color = "#ffffff";

          setStatus(`✅ "${msg}"`, "#059669");
          setMicUI("send");
          stopMain();
          doSend(inp, msg);
        }
      };

      mainRec.onerror = function(e) {
        if(e.error === "aborted") {
          isMain = false;
          return;
        }
        const errors = {
          "no-speech": "Kuch sunai nahi diya, dobara try karo!",
          "not-allowed": "⚠️ Mic permission do! Settings > Microphone",
          "network": "Internet check karo!",
          "audio-capture": "Mic available nahi hai!"
        };
        setStatus(errors[e.error] || "Voice error: " + e.error, "#DC2626");
        resetMain();
        setTimeout(startWake, 1000);
      };

      mainRec.onend = function() {
        if(!hasResult && !isSending) {
          resetMain();
          setTimeout(startWake, 800);
        } else {
          isMain = false;
          mainRec = null;
        }
      };

      mainRec.start();

    } catch(e) {
      resetMain();
      setTimeout(startWake, 1000);
    }
  }

  function stopMain() {
    isMain = false;
    if(mainRec) {
      try { mainRec.stop(); } catch(e) {}
    }
  }

  function resetMain() {
    isMain = false;
    isSending = false;
    hasResult = false;
    mainRec = killRec(mainRec);
    setMicUI("off");
    setStatus("Ready! 'Hey DRISHTI' bolo ya 🎙 tap karo", "#4B5563");
  }

  function doSend(inp, msg) {
    if(isSending) return;
    isSending = true;

    setTimeout(() => {
      if(window.send) {
        window.send();
      }
      setTimeout(() => {
        if(inp) inp.style.color = "#ffffff";
        isSending = false;
        hasResult = false;
        setMicUI("off");
        // Wake word wapas start karo
        setTimeout(startWake, 1200);
      }, 600);
    }, 350);
  }

  // ── PUBLIC API ──
  return {
    isListening: false,
    lastInputWasVoice: false,

    init: function() {
      // iOS user interaction track
      document.addEventListener("touchstart", function() {
        window._drishtiUserInteracted = true;
      }, { once: true });
      document.addEventListener("click", function() {
        window._drishtiUserInteracted = true;
      }, { once: true });

      // Mic button
      const mic = document.getElementById("mic");
      if(mic) {
        mic.removeAttribute("onclick");

        mic.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window._drishtiUserInteracted = true;
          if(isMain) {
            stopMain();
            resetMain();
            setTimeout(startWake, 500);
          } else {
            startMain();
          }
        });

        mic.addEventListener("touchstart", (e) => {
          e.preventDefault();
          window._drishtiUserInteracted = true;
          if(isMain) {
            stopMain();
            resetMain();
            setTimeout(startWake, 500);
          } else {
            startMain();
          }
        }, { passive: false });
      }

      // Input typing detect
      const inp = document.getElementById("inp");
      if(inp) {
        inp.addEventListener("input", () => {
          this.lastInputWasVoice = false;
        });
      }

      // Wake word shuru karo
      if(HAS_SR) {
        if(IS_IOS) {
          // iOS: pehle touch ke baad
          document.addEventListener("touchend", () => {
            setTimeout(startWake, 500);
          }, { once: true });
        } else {
          setTimeout(startWake, 1000);
        }
      }

      setStatus("Ready! 'Hey DRISHTI' bolo ya 🎙 tap karo", "#4B5563");
      console.log(`✅ DRISHTI Voice v5.0 | iOS:${IS_IOS} Android:${IS_ANDROID} Safari:${IS_SAFARI} SR:${HAS_SR}`);
    }
  };
})();

// Auto init
if(document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
} else {
  setTimeout(() => window.DrishtiVoice.init(), 100);
}
