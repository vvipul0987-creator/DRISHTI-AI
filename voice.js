/**
 * DRISHTI ENGINE - FINAL RECOVERY
 * VIPUL VERMA SPECIAL | ZERO-LOOP | AUTO-CLEAN
 */

window.DrishtiVoice = {
  isListening: false,
  recognition: null,
  silenceTimer: null,
  isProcessing: false, // 🛡️ SAFETY LOCK: दोबारा सेंड होने से रोकने के लिए

  init: function() {
    this.injectStyles();
    const mic = document.getElementById("mic");
    if(mic) {
      // पुराने सारे Listeners खत्म करने के लिए Clone
      const newMic = mic.cloneNode(true);
      mic.replaceWith(newMic);
      newMic.addEventListener("click", () => this.handleAction());
    }
    console.log("✅ DRISHTI FINAL ENGINE: READY");
  },

  injectStyles: function() {
    if(document.getElementById('dv-fonts')) return;
    const style = document.createElement('style');
    style.id = 'dv-fonts';
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap');
      body { font-family: 'Rajdhani', sans-serif !important; }
      #mic { font-family: 'Orbitron', sans-serif !important; transition: 0.3s; }
      .mic-active { background: #ff0055 !important; box-shadow: 0 0 20px #ff0055 !important; transform: scale(1.1); }
      #sbar { color: #00f2ff; font-family: 'Orbitron'; font-size: 11px; }
    `;
    document.head.appendChild(style);
  },

  handleAction: function() {
    if (this.isListening) this.terminate(true);
    else this.startEngine();
  },

  startEngine: function() {
    if(this.isProcessing) return; // अगर काम चल रहा है तो स्टार्ट मत करो

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return;

    this.recognition = new SR();
    this.recognition.lang = "hi-IN";
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      document.getElementById("mic").classList.add("mic-active");
      document.getElementById("sbar").textContent = "LISTENING...";
    };

    this.recognition.onresult = (e) => {
      if(this.isProcessing) return;

      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      
      const inp = document.getElementById("inp");
      if(inp) inp.value = transcript;

      // 🧠 SMART STOP: 1.5 सेकंड की शांति मतलब बात खत्म
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if(transcript.trim().length > 0) this.terminate(true);
      }, 1500);
    };

    this.recognition.onerror = () => this.terminate(false);
    this.recognition.onend = () => { if(this.isListening) this.recognition.start(); };

    this.recognition.start();
  },

  terminate: function(sendMsg) {
    this.isListening = false;
    clearTimeout(this.silenceTimer);

    if(this.recognition) {
      this.recognition.onend = null; // माइक को जबरदस्ती 'Kill' करना
      this.recognition.stop();
      this.recognition = null;
    }

    document.getElementById("mic").classList.remove("mic-active");
    document.getElementById("sbar").textContent = "STANDBY";

    if(sendMsg && !this.isProcessing) {
      const inp = document.getElementById("inp");
      if(window.send && inp.value.trim() !== "") {
        this.isProcessing = true; // लॉक चालू
        window.send();
        
        // सेंड होने के बाद डेटा एकदम साफ़
        setTimeout(() => {
          inp.value = ""; 
          this.isProcessing = false; // लॉक खुला
        }, 500);
      }
    }
  }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
