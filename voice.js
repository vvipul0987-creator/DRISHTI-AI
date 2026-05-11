// voice.js — DRISHTI The Flawless Engine v6.0
// VIPUL VERMA EXCLUSIVE | ZERO-LEAK | ZERO-LOOP

window.DrishtiVoice = {
  isListening: false,
  isWakeListening: false,
  recognition: null,
  wakeRecognition: null,
  isSending: false,
  hasResult: false,
  clickLock: false, // 🛡️ Tap-Spam Protection

  browser: {
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isAndroid: /android/i.test(navigator.userAgent),
  },

  injectAesthetics: function() {
    if (document.getElementById('dv-flawless-css')) return;
    const style = document.createElement('style');
    style.id = 'dv-flawless-css';
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap');
      body { font-family: 'Rajdhani', sans-serif !important; }
      #mic { font-family: 'Orbitron', sans-serif !important; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; }
      .mic-wake { box-shadow: 0 0 15px #F59E0B; background: #F59E0B !important; }
      .mic-active { box-shadow: 0 0 25px #DC2626; background: #DC2626 !important; transform: scale(1.1); }
      #sbar { font-family: 'Orbitron', sans-serif; font-size: 12px; transition: color 0.3s ease; }
    `;
    document.head.appendChild(style);
  },

  init: function() {
    this.injectAesthetics();
    
    // iOS Hard Audio Wakeup
    if(this.browser.isIOS) {
        const unlockAudio = () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if(AudioContext) {
                const ctx = new AudioContext();
                if(ctx.state === 'suspended') ctx.resume();
            }
            document.removeEventListener('touchstart', unlockAudio);
        };
        document.addEventListener('touchstart', unlockAudio);
    }

    const mic = document.getElementById("mic");
    if(mic) {
      mic.replaceWith(mic.cloneNode(true));
      const newMic = document.getElementById("mic");
      
      const handleMicTap = (e) => {
          e.preventDefault();
          if(this.clickLock || this.isSending) return; // 🛡️ Spam Lock
          this.clickLock = true;
          setTimeout(() => { this.clickLock = false; }, 400); // 400ms Cooldown
          this.toggle();
      };

      newMic.addEventListener("click", handleMicTap);
      newMic.addEventListener("touchstart", handleMicTap, { passive: false });
    }

    const inp = document.getElementById("inp");
    if(inp) inp.addEventListener("input", () => { this.hasResult = false; });

    if(!this.browser.isIOS) {
        this.startWakeWord();
        this.showMsg("READY! 'Hey DRISHTI' बोलो या टैप करो 🎙", "normal");
    } else {
        this.showMsg("APPLE SYSTEM READY: टैप करके बोलें 🎙", "normal");
    }
    
    console.log("💎 DRISHTI v6.0 FLAWLESS ENGINE RUNNING");
  },

  // ── WAKE WORD (Optimized for Memory) ──
  startWakeWord: function() {
    if(this.browser.isIOS) return; 
    
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR || this.isWakeListening || this.isListening) return;

    try {
      this.wakeRecognition = new SR();
      this.wakeRecognition.lang = "hi-IN";
      this.wakeRecognition.continuous = true;
      this.wakeRecognition.interimResults = true;

      this.wakeRecognition.onresult = (e) => {
        for(let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.toLowerCase();
          if(text.includes("drishti") || text.includes("दृष्टि") || text.includes("hey drishti")) {
            this.onWakeWord();
            break;
          }
        }
      };

      this.wakeRecognition.onend = () => {
        this.isWakeListening = false;
        // 🔬 Memory Leak Prevention: Nullify old instance before restarting
        this.wakeRecognition = null; 
        if(!this.isListening && !this.browser.isIOS) setTimeout(() => this.startWakeWord(), 800);
      };

      this.wakeRecognition.start();
      this.isWakeListening = true;
    } catch(e) {}
  },

  onWakeWord: function() {
    if(this.isListening) return;
    this.stopWakeWord();
    
    this.setMicStyle("wake");
    this.showMsg("👋 HEY DRISHTI! बोलिए...", "active");
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);

    setTimeout(() => this.start(), 500);
  },

  stopWakeWord: function() {
    if(this.wakeRecognition) {
      try { this.wakeRecognition.onend = null; this.wakeRecognition.abort(); } catch(e) {}
      this.wakeRecognition = null;
    }
    this.isWakeListening = false;
  },

  // ── MAIN ENGINE (Zero-Loop Precision) ──
  toggle: function() {
    this.isListening ? this.stop(false) : this.start();
  },

  start: function() {
    if(this.isListening || this.isSending) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return;

    this.stopWakeWord();

    this.recognition = new SR();
    this.recognition.lang = "hi-IN";
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.hasResult = false;
      this.setMicStyle("active");
      this.showMsg("🎙 सुन रही हूँ...", "active");
    };

    this.recognition.onresult = (e) => {
      if(this.hasResult || this.isSending) return;

      let interim = "", final = "";
      for(let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if(e.results[i].isFinal) final += t;
        else interim += t;
      }

      const inp = document.getElementById("inp");
      if(interim && !final && inp) inp.value = interim;

      if(final) {
        this.hasResult = true;
        this.recognition.onresult = null; // 🛡️ Ghost-Killer

        let cleanText = final.replace(/hey drishti/gi, "").replace(/drishti/gi, "").replace(/दृष्टि/g, "").trim();
        if(inp) inp.value = cleanText;
        
        this.showMsg(`✅ सुना: "${cleanText}"`, "success");
        this.stop(true); 
      }
    };

    this.recognition.onerror = () => this.reset();
    this.recognition.onend = () => { 
        if(!this.hasResult && !this.isSending) this.reset(); 
    };

    try { this.recognition.start(); } catch(e) { this.reset(); }
  },

  stop: function(shouldSend) {
    this.isListening = false;
    if(this.recognition) {
      try { this.recognition.onend = null; this.recognition.stop(); } catch(e) {}
      this.recognition = null; // 🔬 Memory Cleanup
    }
    this.setMicStyle("normal");

    if(shouldSend && !this.isSending) {
      this.isSending = true; 
      setTimeout(() => {
        const inp = document.getElementById("inp");
        if(window.send && inp && inp.value.trim() !== "") {
          window.send();
          setTimeout(() => {
            if(inp) inp.value = "";
            this.isSending = false;
            if(!this.browser.isIOS) setTimeout(() => this.startWakeWord(), 1000); 
          }, 400);
        } else {
            this.isSending = false;
            if(!this.browser.isIOS) setTimeout(() => this.startWakeWord(), 1000);
        }
      }, 300);
    }
  },

  reset: function() {
    this.isListening = false;
    this.isSending = false;
    this.hasResult = false;
    if(this.recognition) { 
        try { this.recognition.abort(); } catch(e) {} 
        this.recognition = null;
    }
    this.setMicStyle("normal");
    this.showMsg(this.browser.isIOS ? "APPLE SYSTEM: टैप करके बोलें 🎙" : "READY! 'Hey DRISHTI' बोलो या टैप करो 🎙", "normal");
    if(!this.browser.isIOS) setTimeout(() => this.startWakeWord(), 1000);
  },

  setMicStyle: function(state) {
    const mic = document.getElementById("mic");
    if(!mic) return;
    mic.className = state === "active" ? "mic-active" : (state === "wake" ? "mic-wake" : "");
    mic.innerHTML = state === "active" ? "🔴" : (state === "wake" ? "✨" : "🎙");
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
