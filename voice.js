// voice.js — DRISHTI Ultimate v8.0 (The Flawless Hybrid)
// 🛠️ FIX: Loop, Ghost-results, and iOS Crashing
// 🎨 STYLE: Orbitron & Rajdhani Integration

window.DrishtiVoice = {
  isListening: false,
  isSending: false,
  hasFinalResult: false,
  recognition: null,
  wakeRecognition: null,
  isWakeListening: false,
  engineLock: false, // 🛡️ 'Spam' रोकने के लिए एक्स्ट्रा लॉक

  browser: {
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isAndroid: /android/i.test(navigator.userAgent)
  },

  init: function() {
    this.injectStyles();
    
    const mic = document.getElementById("mic");
    if(mic) {
      // पुराने इवेंट्स हटाकर नए जोड़ना
      const newMic = mic.cloneNode(true);
      mic.replaceWith(newMic);
      
      const tapHandler = (e) => {
        e.preventDefault();
        if(!this.isSending && !this.engineLock) this.toggle();
      };
      
      newMic.addEventListener("click", tapHandler);
      newMic.addEventListener("touchstart", tapHandler, { passive: false });
    }

    // Android/PC के लिए Wake Word चालू
    if(!this.browser.isIOS) {
      setTimeout(() => this.startWakeWord(), 2000);
      this.showMsg("Drishti: Wake Word Active ✨", "normal");
    } else {
      this.showMsg("Apple Device: Tap to Speak 🎙", "normal");
    }
    
    console.log("💎 DRISHTI v8.0 ONLINE — ZERO GHOSTING MODE");
  },

  injectStyles: function() {
    if (document.getElementById('dr-v8-css')) return;
    const style = document.createElement('style');
    style.id = 'dr-v8-css';
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap');
      #mic { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      .mic-active { transform: scale(1.2); box-shadow: 0 0 30px #DC2626 !important; background: #DC2626 !important; }
      .mic-sending { transform: rotate(360deg); opacity: 0.7; pointer-events: none; }
      #sbar { font-family: 'Orbitron', sans-serif; letter-spacing: 1px; }
    `;
    document.head.appendChild(style);
  },

  // ── WAKE WORD SYSTEM (FOR ANDROID) ──
  startWakeWord: function() {
    if(this.browser.isIOS || this.isListening || this.isWakeListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return;

    this.wakeRecognition = new SR();
    this.wakeRecognition.lang = "hi-IN";
    this.wakeRecognition.continuous = true;
    
    this.wakeRecognition.onresult = (e) => {
      const text = e.results[e.results.length-1][0].transcript.toLowerCase();
      if(text.includes("drishti") || text.includes("दृष्टि")) {
        this.stopWakeWord();
        this.start();
      }
    };
    
    this.wakeRecognition.onend = () => {
      this.isWakeListening = false;
      if(!this.isListening) setTimeout(() => this.startWakeWord(), 1000);
    };
    
    try { this.wakeRecognition.start(); this.isWakeListening = true; } catch(e) {}
  },

  stopWakeWord: function() {
    if(this.wakeRecognition) {
      this.wakeRecognition.onend = null;
      try { this.wakeRecognition.abort(); } catch(e) {}
      this.wakeRecognition = null;
    }
    this.isWakeListening = false;
  },

  // ── MAIN VOICE ENGINE ──
  toggle: function() {
    if(this.isListening) this.stop(false);
    else this.start();
  },

  start: function() {
    if(this.isSending || this.isListening) return;
    this.stopWakeWord();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = "hi-IN";
    this.recognition.interimResults = true;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.hasFinalResult = false;
      this.updateMicUI("active");
      this.showMsg("🎙 LISTENING...", "active");
    };

    this.recognition.onresult = (e) => {
      if(this.hasFinalResult || this.isSending) return;

      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          this.processResult(transcript);
        } else {
          interim = transcript;
        }
      }
      
      if(interim && !this.hasFinalResult) {
        const inp = document.getElementById("inp");
        if(inp) { 
          inp.value = interim;
          inp.style.color = "#A855F7"; // Interim text in Purple
        }
      }
    };

    this.recognition.onerror = () => this.reset();
    this.recognition.onend = () => { if(!this.hasFinalResult) this.reset(); };

    try { this.recognition.start(); } catch(e) { this.reset(); }
  },

  processResult: function(text) {
    this.hasFinalResult = true;
    this.isSending = true; // 🛡️ LOCK: अब कोई दूसरा रिजल्ट नहीं आएगा
    this.engineLock = true;
    
    if(this.recognition) {
        this.recognition.onresult = null;
        this.recognition.stop();
    }

    const inp = document.getElementById("inp");
    let cleanText = text.replace(/hey drishti/gi, "").replace(/drishti/gi, "").replace(/दृष्टि/g, "").trim();
    
    if(inp) {
        inp.value = cleanText;
        inp.style.color = "#ffffff";
    }

    this.updateMicUI("sending");
    this.showMsg("✅ SENT", "success");

    // ⚡ INNOVATION: सेंड फंक्शन को कॉल करने का सबसे सुरक्षित तरीका
    setTimeout(() => {
      if(window.send) {
          window.send();
          setTimeout(() => this.reset(), 1000); // 1 सेकंड बाद वापस नॉर्मल
      } else {
          this.reset();
      }
    }, 400);
  },

  stop: function(send) {
    if(this.recognition) this.recognition.stop();
    if(!send) this.reset();
  },

  reset: function() {
    this.isListening = false;
    this.isSending = false;
    this.hasFinalResult = false;
    this.engineLock = false;
    this.updateMicUI("normal");
    this.showMsg(this.browser.isIOS ? "Tap Mic to Speak" : "Ready: 'Hey Drishti'", "normal");
    if(!this.browser.isIOS) this.startWakeWord();
  },

  updateMicUI: function(state) {
    const mic = document.getElementById("mic");
    if(!mic) return;
    mic.className = ""; // Reset classes
    if(state === "active") {
        mic.classList.add("mic-active");
        mic.innerHTML = "🔴";
    } else if(state === "sending") {
        mic.classList.add("mic-sending");
        mic.innerHTML = "✨";
    } else {
        mic.innerHTML = "🎙";
    }
  },

  showMsg: function(msg, type) {
    const s = document.getElementById("sbar");
    if(!s) return;
    s.textContent = msg;
    const colors = { active: "#A855F7", success: "#059669", error: "#DC2626", normal: "#00f2ff" };
    s.style.color = colors[type] || colors.normal;
  }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
