// voice.js — DRISHTI Voice System
// Safari + Chrome + Android + iPhone + iPad support

window.DrishtiVoice = {
  isListening: false,
  recognition: null,
  lastInputWasVoice: false,

  init: function() {
    const mic = document.getElementById("mic");
    if(mic) {
      mic.removeAttribute("onclick");
      mic.addEventListener("click", () => this.toggle());
    }
    console.log("✅ Voice system ready!");
  },

  toggle: function() {
    if(this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  },

  start: function() {
    const SR = window.SpeechRecognition || 
               window.webkitSpeechRecognition ||
               window.mozSpeechRecognition;
    
    if(!SR) {
      alert("Voice ke liye Chrome ya Safari use karo!");
      return;
    }

    this.recognition = new SR();
    
    // Hindi + English dono support
    this.recognition.lang = window.DrishtiLang ? 
      window.DrishtiLang.current === "hindi" ? "hi-IN" : "en-US" 
      : "hi-IN";
    
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.lastInputWasVoice = true;
      const mic = document.getElementById("mic");
      if(mic) {
        mic.style.background = "#DC2626";
        mic.textContent = "🔴";
      }
      document.getElementById("sbar").textContent = "Sun rahi hoon... boliye! 🎙";
    };

    this.recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      document.getElementById("inp").value = text;
      document.getElementById("sbar").textContent = `Suna: "${text}"`;
      // Auto send
      setTimeout(() => {
        if(window.send) window.send();
      }, 300);
    };

    this.recognition.onerror = (e) => {
      console.log("Voice error:", e.error);
      if(e.error === "no-speech") {
        document.getElementById("sbar").textContent = "Kuch sunai nahi diya, dobara try karo!";
      } else if(e.error === "not-allowed") {
        alert("Mic permission do! Settings > Safari > Microphone");
      }
      this.reset();
    };

    this.recognition.onend = () => {
      this.reset();
    };

    try {
      this.recognition.start();
    } catch(e) {
      console.log("Recognition start error:", e);
      this.reset();
    }
  },

  stop: function() {
    if(this.recognition) {
      this.recognition.stop();
    }
    this.reset();
  },

  reset: function() {
    this.isListening = false;
    const mic = document.getElementById("mic");
    if(mic) {
      mic.style.background = "#EC4899";
      mic.textContent = "🎙";
    }
    document.getElementById("sbar").textContent = "Ready!";
  }
};

// Auto init
document.addEventListener("DOMContentLoaded", () => {
  window.DrishtiVoice.init();
});
