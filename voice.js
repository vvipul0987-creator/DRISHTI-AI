// voice.js — DRISHTI Ultimate Voice System v2.0
// iPhone + iPad + Android + Safari + Chrome — Sab Support

window.DrishtiVoice = {
  isListening: false,
  recognition: null,
  lastInputWasVoice: false,
  retryCount: 0,
  maxRetry: 3,

  // Browser detect
  browser: {
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    isChrome: /chrome/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /android/i.test(navigator.userAgent),
  },

  init: function() {
    const mic = document.getElementById("mic");
    if(mic) {
      mic.removeAttribute("onclick");
      mic.addEventListener("click", () => this.toggle());
      mic.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.toggle();
      }, { passive: false });
    }

    // iOS ke liye special handling
    if(this.browser.isIOS) {
      document.addEventListener("touchend", () => {
        if(window.speechSynthesis) {
          speechSynthesis.resume();
        }
      }, { once: true });
    }

    this.setupHindiKeyboard();
    console.log("✅ DRISHTI Voice Ready!", this.browser);
  },

  // Hindi keyboard shortcut
  setupHindiKeyboard: function() {
    const inp = document.getElementById("inp");
    if(!inp) return;
    inp.addEventListener("keydown", () => {
      this.lastInputWasVoice = false;
    });
  },

  toggle: function() {
    if(this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  },

  getLang: function() {
    // Language system se milega — default Hindi
    if(window.DrishtiLang) {
      return window.DrishtiLang.current === "english" ? "en-US" : "hi-IN";
    }
    return "hi-IN";
  },

  start: function() {
    // Browser support check
    const SR = window.SpeechRecognition ||
               window.webkitSpeechRecognition ||
               window.mozSpeechRecognition ||
               window.msSpeechRecognition;

    if(!SR) {
      this.showError("Aapka browser voice support nahi karta. Chrome ya Safari use karo!");
      return;
    }

    // iOS Safari special permission
    if(this.browser.isIOS && this.browser.isSafari) {
      this.startIOSSafari(SR);
    } else {
      this.startNormal(SR);
    }
  },

  startIOSSafari: function(SR) {
    // iOS Safari ke liye special setup
    this.recognition = new SR();
    this.recognition.lang = this.getLang();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3; // Multiple alternatives for better Hindi

    this.setupEvents();

    try {
      this.recognition.start();
      this.setListening(true);
    } catch(e) {
      if(e.name === "InvalidStateError") {
        this.recognition.stop();
        setTimeout(() => this.start(), 500);
      }
    }
  },

  startNormal: function(SR) {
    this.recognition = new SR();
    
    // Hindi ke liye best settings
    this.recognition.lang = this.getLang();
    this.recognition.continuous = false;
    this.recognition.interimResults = true; // Real-time text dikhao
    this.recognition.maxAlternatives = 3;

    this.setupEvents();

    try {
      this.recognition.start();
      this.setListening(true);
    } catch(e) {
      console.error("Voice start error:", e);
      this.reset();
    }
  },

  setupEvents: function() {
    // Interim results — real-time text
    this.recognition.onresult = (e) => {
      let interimText = "";
      let finalText = "";

      for(let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if(e.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      // Real-time dikhaao
      if(interimText) {
        document.getElementById("inp").value = interimText;
        document.getElementById("inp").style.color = "#A855F7";
      }

      // Final text
      if(finalText) {
        // Hindi text clean karo
        const cleanText = this.cleanHindiText(finalText);
        document.getElementById("inp").value = cleanText;
        document.getElementById("inp").style.color = "#ffffff";
        document.getElementById("sbar").textContent = `Suna: "${cleanText}" ✅`;
        this.lastInputWasVoice = true;
        this.retryCount = 0;

        // Auto send
        setTimeout(() => {
          if(window.send) window.send();
        }, 400);
      }
    };

    this.recognition.onstart = () => {
      this.setListening(true);
      document.getElementById("sbar").textContent = "🎙 Sun rahi hoon... Hindi ya English mein boliye!";
    };

    this.recognition.onspeechstart = () => {
      document.getElementById("sbar").textContent = "🎙 Awaaz aa rahi hai...";
    };

    this.recognition.onspeechend = () => {
      document.getElementById("sbar").textContent = "⏳ Samajh rahi hoon...";
    };

    this.recognition.onerror = (e) => {
      console.log("Voice error:", e.error);
      switch(e.error) {
        case "no-speech":
          if(this.retryCount < this.maxRetry) {
            this.retryCount++;
            document.getElementById("sbar").textContent = `Kuch sunai nahi diya... dobara boliye (${this.retryCount}/${this.maxRetry})`;
            setTimeout(() => this.start(), 1000);
          } else {
            this.retryCount = 0;
            this.showError("Kuch sunai nahi diya. Mic ke paas boliye!");
            this.reset();
          }
          break;
        case "not-allowed":
          this.showError("Mic ki permission chahiye!\niPad: Settings > Safari > Microphone\nAndroid: Chrome > Settings > Microphone");
          this.reset();
          break;
        case "network":
          this.showError("Internet check karo!");
          this.reset();
          break;
        case "aborted":
          this.reset();
          break;
        default:
          this.showError("Voice error: " + e.error);
          this.reset();
      }
    };

    this.recognition.onend = () => {
      if(this.isListening) {
        this.reset();
      }
    };
  },

  // Hindi text clean karna
  cleanHindiText: function(text) {
    // Common English to Hindi corrections
    const corrections = {
      "hello": "hello",
      "hi": "hi",
      "python": "Python",
      "javascript": "JavaScript",
      "html": "HTML",
      "css": "CSS",
    };
    
    let cleaned = text.trim();
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned;
  },

  setListening: function(state) {
    this.isListening = state;
    const mic = document.getElementById("mic");
    if(!mic) return;

    if(state) {
      mic.style.background = "#DC2626";
      mic.style.boxShadow = "0 0 20px #DC262688";
      mic.innerHTML = "🔴";
      mic.style.animation = "pulse 1s infinite";
    } else {
      mic.style.background = "#EC4899";
      mic.style.boxShadow = "none";
      mic.innerHTML = "🎙";
      mic.style.animation = "none";
    }
  },

  stop: function() {
    if(this.recognition) {
      try {
        this.recognition.stop();
      } catch(e) {}
    }
    this.reset();
  },

  reset: function() {
    this.isListening = false;
    this.setListening(false);
    const sbar = document.getElementById("sbar");
    if(sbar) sbar.textContent = "Ready! 🎙 Mic tap karo ya type karo";
  },

  showError: function(msg) {
    const sbar = document.getElementById("sbar");
    if(sbar) {
      sbar.textContent = "⚠️ " + msg;
      sbar.style.color = "#DC2626";
      setTimeout(() => {
        sbar.style.color = "#4B5563";
        sbar.textContent = "Ready!";
      }, 3000);
    }
  }
};

// Auto init when page loads
if(document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
} else {
  window.DrishtiVoice.init();
}
