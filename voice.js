/**
 * DRISHTI OMNI-CORE v4.0
 * Pure Precision | Single-Message Lock | Auto-Kill Switch
 */

window.DrishtiVoice = {
  isListening: false,
  recognition: null,
  silenceTimer: null,
  isSending: false, // NEW: दोबारा सेंड होने से रोकने के लिए लॉक

  injectAesthetics: function() {
    if (document.getElementById('drishti-v4-css')) return;
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'drishti-v4-css';
    style.innerHTML = `
      body { font-family: 'Rajdhani', sans-serif !important; }
      #mic { font-family: 'Orbitron', sans-serif !important; transition: 0.3s ease; border-radius: 50%; }
      .mic-on { 
        background: #ff0055 !important; 
        box-shadow: 0 0 20px #ff0055;
        transform: scale(1.1);
      }
      #sbar { font-family: 'Orbitron', sans-serif; color: #ff0055; font-size: 12px; }
    `;
    document.head.appendChild(style);
  },

  init: function() {
    this.injectAesthetics();
    const mic = document.getElementById("mic");
    if(mic) {
      mic.replaceWith(mic.cloneNode(true)); 
      document.getElementById("mic").addEventListener("click", () => this.toggle());
    }
    console.log("🌌 DRISHTI v4.0: One-Chat Logic Active");
  },

  toggle: function() {
    this.isListening ? this.stopAndSend(true) : this.start();
  },

  start: function() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return;

    // Reset State
    this.isSending = false; 
    const inp = document.getElementById("inp");
    if(inp) inp.value = ""; // शुरुआत में ही साफ़

    this.recognition = new SR();
    this.recognition.lang = "hi-IN";
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      document.getElementById("mic").classList.add("mic-on");
      document.getElementById("sbar").textContent = "LISTENING...";
    };

    this.recognition.onresult = (e) => {
      if(this.isSending) return; // अगर सेंड हो रहा है तो कुछ मत करो

      let current = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        current += e.results[i][0].transcript;
      }
      const inp = document.getElementById("inp");
      if(inp) inp.value = current;

      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if(current.trim().length > 0) this.stopAndSend(true);
      }, 1600);
    };

    this.recognition.onend = () => {
      if(this.isListening) this.recognition.start();
    };

    this.recognition.start();
  },

  stopAndSend: function(shouldSend) {
    if(this.isSending) return; // दोबारा सेंड होने से बचाओ
    
    this.isListening = false;
    clearTimeout(this.silenceTimer);

    if(this.recognition) {
      this.recognition.onend = null; 
      this.recognition.stop();
    }

    document.getElementById("mic").classList.remove("mic-on");
    document.getElementById("sbar").textContent = "STANDBY";

    if(shouldSend) {
      const inp = document.getElementById("inp");
      if(window.send && inp.value.trim() !== "") {
        this.isSending = true; // लॉक लगाओ
        window.send();
        
        // सेंड करने के तुरंत बाद कचरा साफ़
        setTimeout(() => {
          inp.value = ""; 
          this.isSending = false; // अगले मैसेज के लिए लॉक खोलो
        }, 300);
      }
    }
  }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
