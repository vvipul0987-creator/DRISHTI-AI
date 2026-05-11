// voice.js — DRISHTI Ultimate Voice System v4.0
// Hey DRISHTI wake word + All fixes + Futuristic

window.DrishtiVoice = {
  isListening: false,
  isWakeListening: false, // Wake word ke liye alag
  recognition: null,
  wakeRecognition: null, // Wake word recognition
  lastInputWasVoice: false,
  isSending: false,
  hasResult: false,
  wakeWord: "drishti", // Wake word

  browser: {
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    isChrome: /chrome/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /android/i.test(navigator.userAgent),
  },

  init: function() {
    // Mic button
    const mic = document.getElementById("mic");
    if(mic) {
      mic.removeAttribute("onclick");
      mic.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if(!this.isSending) this.toggle();
      });
      mic.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if(!this.isSending) this.toggle();
      }, { passive: false });
    }

    // Input clear hone par reset
    const inp = document.getElementById("inp");
    if(inp) {
      inp.addEventListener("input", () => {
        this.lastInputWasVoice = false;
      });
    }

    // Wake word shuru karo
    this.startWakeWord();

    // Status bar update
    this.showMsg("Ready! 'Hey DRISHTI' bolo ya mic tap karo 🎙", "normal");
    console.log("✅ DRISHTI Voice v4.0 — Hey DRISHTI Ready!");
  },

  // ── WAKE WORD SYSTEM ──
  startWakeWord: function() {
    const SR = window.SpeechRecognition ||
               window.webkitSpeechRecognition;
    if(!SR) return;

    // iOS mein wake word background mein nahi chalta
    // User tap ke baad shuru hoga
    if(this.browser.isIOS) {
      document.addEventListener("touchend", () => {
        if(!this.isWakeListening && !this.isListening) {
          this.initWakeWord(SR);
        }
      }, { once: true });
      return;
    }

    this.initWakeWord(SR);
  },

  initWakeWord: function(SR) {
    if(this.isWakeListening) return;

    try {
      this.wakeRecognition = new SR();
      this.wakeRecognition.lang = "hi-IN";
      this.wakeRecognition.continuous = true;
      this.wakeRecognition.interimResults = true;

      this.wakeRecognition.onresult = (e) => {
        for(let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.toLowerCase();

          // Wake word check
          if(text.includes("drishti") || 
             text.includes("dristi") || 
             text.includes("दृष्टि") ||
             text.includes("hey drishti") ||
             text.includes("ड्रिश्टि")) {

            // Wake word mila!
            this.onWakeWord();
            break;
          }
        }
      };

      this.wakeRecognition.onend = () => {
        this.isWakeListening = false;
        // Restart wake word — hamesha sunta rahe
        if(!this.isListening) {
          setTimeout(() => this.initWakeWord(SR), 1000);
        }
      };

      this.wakeRecognition.onerror = (e) => {
        this.isWakeListening = false;
        if(e.error !== "aborted" && e.error !== "not-allowed") {
          setTimeout(() => this.initWakeWord(SR), 2000);
        }
      };

      this.wakeRecognition.start();
      this.isWakeListening = true;

    } catch(e) {
      console.log("Wake word error:", e);
    }
  },

  onWakeWord: function() {
    if(this.isListening) return;

    // Wake word mila — main mic on karo
    this.stopWakeWord();

    // Visual feedback
    this.showWakeAnimation();
    this.showMsg("👋 Hey DRISHTI! Boliye...", "active");

    // Thodi vibration (Android)
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);

    // Main mic shuru karo
    setTimeout(() => this.start(), 500);
  },

  showWakeAnimation: function() {
    const mic = document.getElementById("mic");
    if(!mic) return;
    mic.style.background = "#F59E0B";
    mic.style.boxShadow = "0 0 30px #F59E0B";
    mic.innerHTML = "✨";
    setTimeout(() => {
      mic.style.background = "#DC2626";
      mic.innerHTML = "🔴";
    }, 500);
  },

  stopWakeWord: function() {
    if(this.wakeRecognition) {
      try { this.wakeRecognition.abort(); } catch(e) {}
      this.wakeRecognition = null;
    }
    this.isWakeListening = false;
  },

  getLang: function() {
    if(window.DrishtiLang) {
      return window.DrishtiLang.current === "english" ? "en-US" : "hi-IN";
    }
    return "hi-IN";
  },

  toggle: function() {
    if(this.isListening) {
      this.stop();
    } else {
      this.hasResult = false;
      this.start();
    }
  },

  start: function() {
    if(this.isListening || this.isSending) return;

    const SR = window.SpeechRecognition ||
               window.webkitSpeechRecognition;

    if(!SR) {
      this.showMsg("Chrome ya Safari use karo!", "error");
      return;
    }

    if(this.recognition) {
      try { this.recognition.abort(); } catch(e) {}
      this.recognition = null;
    }

    this.recognition = new SR();
    this.recognition.lang = this.getLang();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.hasResult = false;
      this.setMic(true);
      this.showMsg("🎙 Sun rahi hoon...", "active");
    };

    this.recognition.onresult = (e) => {
      if(this.hasResult) return;

      let interim = "";
      let final = "";

      for(let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if(e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      const inp = document.getElementById("inp");
      if(!inp) return;

      if(interim && !final) {
        inp.value = interim;
        inp.style.color = "#A855F7";
      }

      if(final) {
        this.hasResult = true;
        const clean = final.trim();

        // Wake word ko message se hatao
        const filtered = clean
          .replace(/hey drishti/gi, "")
          .replace(/drishti/gi, "")
          .replace(/दृष्टि/g, "")
          .trim();

        inp.value = filtered || clean;
        inp.style.color = "#ffffff";
        this.lastInputWasVoice = true;
        this.showMsg(`✅ Suna: "${filtered || clean}"`, "success");

        this.stop();

        if(!this.isSending) {
          this.isSending = true;
          setTimeout(() => {
            if(window.send) window.send();
            setTimeout(() => {
              if(inp) inp.style.color = "#ffffff";
              this.isSending = false;
              // Wake word wapas shuru karo
              setTimeout(() => this.startWakeWord(), 1000);
            }, 500);
          }, 400);
        }
      }
    };

    this.recognition.onerror = (e) => {
      if(e.error === "aborted") return;
      if(e.error === "no-speech") {
        this.showMsg("Kuch sunai nahi diya, dobara boliye!", "error");
      } else if(e.error === "not-allowed") {
        this.showMsg("⚠️ Settings > Microphone permission do!", "error");
      } else {
        this.showMsg("Error: " + e.error, "error");
      }
      this.reset();
      setTimeout(() => this.startWakeWord(), 1000);
    };

    this.recognition.onend = () => {
      if(!this.hasResult && !this.isSending) {
        this.reset();
        setTimeout(() => this.startWakeWord(), 1000);
      } else {
        this.setMic(false);
        this.isListening = false;
      }
    };

    try {
      this.recognition.start();
    } catch(e) {
      this.reset();
    }
  },

  stop: function() {
    this.isListening = false;
    if(this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
    }
    this.setMic(false);
  },

  reset: function() {
    this.isListening = false;
    this.isSending = false;
    this.hasResult = false;
    if(this.recognition) {
      try { this.recognition.abort(); } catch(e) {}
      this.recognition = null;
    }
    this.setMic(false);
    this.showMsg("Ready! 'Hey DRISHTI' bolo ya mic tap karo 🎙", "normal");
  },

  setMic: function(on) {
    const mic = document.getElementById("mic");
    if(!mic) return;
    if(on) {
      mic.style.background = "#DC2626";
      mic.style.boxShadow = "0 0 20px #DC262688";
      mic.innerHTML = "🔴";
    } else {
      mic.style.background = "#EC4899";
      mic.style.boxShadow = "none";
      mic.innerHTML = "🎙";
    }
  },

  showMsg: function(msg, type) {
    const s = document.getElementById("sbar");
    if(!s) return;
    s.textContent = msg;
    const colors = {
      active: "#A855F7",
      success: "#059669",
      error: "#DC2626",
      normal: "#4B5563"
    };
    s.style.color = colors[type] || colors.normal;
    if(type === "error") {
      setTimeout(() => {
        s.style.color = colors.normal;
        s.textContent = "Ready! 'Hey DRISHTI' bolo ya mic tap karo 🎙";
      }, 3000);
    }
  }
};

// Auto init
if(document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
} else {
  window.DrishtiVoice.init();
}
