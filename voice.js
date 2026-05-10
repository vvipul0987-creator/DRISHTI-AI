/**
 * DRISHTI OMNI-CORE v3.0
 * Pure Innovation | Zero-Echo | Auto-Kill Switch
 */

window.DrishtiVoice = {
  isListening: false,
  recognition: null,
  silenceTimer: null,

  // 1. INNOVATION: Futuristic UI Injection (No HTML change)
  injectAesthetics: function() {
    if (document.getElementById('drishti-v3-css')) return;
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'drishti-v3-css';
    style.innerHTML = `
      body { font-family: 'Rajdhani', sans-serif !important; }
      #mic { font-family: 'Orbitron', sans-serif !important; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      .mic-on { 
        background: radial-gradient(circle, #ff0055, #000) !important; 
        box-shadow: 0 0 25px #ff0055 !important;
        transform: scale(1.1);
        animation: pulse-ring 1.5s infinite;
      }
      @keyframes pulse-ring { 0% { opacity: 0.7; } 100% { opacity: 1; } }
      #sbar { font-family: 'Orbitron', sans-serif; letter-spacing: 1px; color: #ff0055; }
    `;
    document.head.appendChild(style);
  },

  init: function() {
    this.injectAesthetics();
    const mic = document.getElementById("mic");
    if(mic) {
      mic.replaceWith(mic.cloneNode(true)); // पुरानी गड़बड़ियाँ खत्म
      document.getElementById("mic").addEventListener("click", () => this.toggle());
    }
    console.log("🌌 DRISHTI v3.0 ACTIVATED");
  },

  toggle: function() {
    this.isListening ? this.stopAndSend(true) : this.start();
  },

  start: function() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return;

    // iOS Safari Fix
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    this.recognition = new SR();
    this.recognition.lang = "hi-IN";
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      document.getElementById("mic").classList.add("mic-on");
      document.getElementById("sbar").textContent = "AI LISTENING...";
    };

    this.recognition.onresult = (e) => {
      let current = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        current += e.results[i][0].transcript;
      }
      const inp = document.getElementById("inp");
      if(inp) inp.value = current;

      // 2. INNOVATION: Smart Silence (1.5s शांति = सेंड)
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if(current.trim().length > 0) this.stopAndSend(true);
      }, 1500);
    };

    this.recognition.onend = () => {
      if(this.isListening) this.recognition.start();
    };

    this.recognition.start();
  },

  // 3. INNOVATION: The Hard Kill-Switch
  stopAndSend: function(shouldSend) {
    this.isListening = false;
    clearTimeout(this.silenceTimer);

    if(this.recognition) {
      this.recognition.onend = null; // स्विच पूरी तरह ऑफ
      this.recognition.stop();
    }

    document.getElementById("mic").classList.remove("mic-on");
    document.getElementById("sbar").textContent = "STANDBY";

    if(shouldSend) {
      setTimeout(() => {
        const inp = document.getElementById("inp");
        if(window.send && inp.value.trim() !== "") {
          window.send();
          inp.value = ""; // सेंड के बाद स्क्रीन साफ़
        }
      }, 100);
    }
  }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
