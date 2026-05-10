// voice.js — DRISHTI Intelligent Sync v7.0
window.DrishtiVoice = {
    isListening: false,
    recognition: null,
    silenceTimer: null,

    init: function() {
        const mic = document.getElementById("mic");
        if(mic) {
            mic.replaceWith(mic.cloneNode(true)); 
            document.getElementById("mic").addEventListener("click", () => this.toggle());
        }
        console.log("💎 DRISHTI Intelligent Sync Activated!");
    },

    toggle: function() {
        this.isListening ? this.stopManual() : this.start();
    },

    start: function() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        if (window.AudioContext || window.webkitAudioContext) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        }

        this.recognition = new SR();
        this.recognition.lang = "hi-IN"; 
        this.recognition.continuous = true; 
        this.recognition.interimResults = true;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI(true);
        };

        this.recognition.onresult = (e) => {
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) final_transcript += e.results[i][0].transcript;
                else interim_transcript += e.results[i][0].transcript;
            }

            const currentText = final_transcript + interim_transcript;
            const inputField = document.getElementById("inp");
            if(inputField) inputField.value = currentText;

            // 🧠 स्मार्ट ऑटो-सेंड और ऑटो-ऑफ (2 सेकंड चुप रहने पर)
            clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
                if(currentText.trim().length > 1) {
                    this.executeFinalSend();
                }
            }, 2000); 
        };

        this.recognition.onend = () => {
            // अगर सिस्टम ने खुद बंद किया है, तो दोबारा ऑन नहीं होगा
            if(this.isListening) {
                try { this.recognition.start(); } catch(e) {}
            }
        };

        this.recognition.start();
    },

    executeFinalSend: function() {
        // 1. पहले लिसनिंग फ्लैग बंद करें ताकि ऑन-एंड लूप न बने
        this.isListening = false;
        
        // 2. रिकग्निशन इंजन को पूरी तरह रोकें
        if(this.recognition) this.recognition.stop();
        
        // 3. UI को रीसेट करें
        this.updateUI(false);
        
        // 4. मैसेज सेंड करें
        setTimeout(() => {
            if(window.send && document.getElementById("inp").value.trim() !== "") {
                window.send();
                document.getElementById("inp").value = ""; // इनपुट साफ़ करें
            }
        }, 300);
    },

    stopManual: function() {
        this.isListening = false;
        if(this.recognition) this.recognition.stop();
        this.updateUI(false);
    },

    updateUI: function(active) {
        const mic = document.getElementById("mic");
        const sbar = document.getElementById("sbar");
        if(active) {
            mic.style.background = "#DC2626";
            mic.innerHTML = "<span>🛑</span>";
            mic.style.boxShadow = "0 0 20px #DC2626";
            sbar.textContent = "सुन रही हूँ...";
        } else {
            mic.style.background = "#EC4899";
            mic.innerHTML = "🎙️";
            mic.style.boxShadow = "none";
            sbar.textContent = "तैयार हूँ!";
        }
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
