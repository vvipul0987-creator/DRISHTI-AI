// voice.js — DRISHTI AI Master Engine v5.2 (Pro Version)
window.DrishtiVoice = {
    isListening: false,
    recognition: null,
    silenceTimer: null,

    init: function() {
        const mic = document.getElementById("mic");
        if(mic) {
            // पुराने इवेंट्स हटाकर साफ़ शुरुआत
            mic.replaceWith(mic.cloneNode(true));
            document.getElementById("mic").addEventListener("click", () => this.toggle());
        }
        console.log("🚀 DRISHTI Pro-Voice Engine Activated!");
    },

    toggle: function() {
        this.isListening ? this.stop() : this.start();
    },

    start: function() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return alert("Browser Support Error!");

        // iPhone/iPad Safari Audio Context Fix
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        this.recognition = new SR();
        this.recognition.lang = "hi-IN"; // शुद्ध हिंदी सपोर्ट
        this.recognition.continuous = true; 
        this.recognition.interimResults = true; // लाइव टाइपिंग चालू

        this.recognition.onstart = () => {
            this.isListening = true;
            const mic = document.getElementById("mic");
            mic.style.background = "radial-gradient(circle, #ff4d4d, #b30000)";
            mic.style.boxShadow = "0 0 20px #ff4d4d";
            mic.innerHTML = "<span>🛑</span>";
            document.getElementById("sbar").textContent = "सुन रही हूँ... बोलिए 🎙️";
        };

        this.recognition.onresult = (e) => {
            let interim_transcript = '';
            let final_transcript = '';

            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    final_transcript += e.results[i][0].transcript;
                } else {
                    interim_transcript += e.results[i][0].transcript;
                }
            }

            const inputField = document.getElementById("inp");
            // जैसे ही तुम बोलोगे, यहाँ लाइव टाइप होगा (Gemini की तरह)
            inputField.value = final_transcript || interim_transcript;
            
            // स्मार्ट ऑटो-सेंड: अगर तुम 2 सेकंड तक चुप रहे, तो खुद सेंड हो जाएगा
            clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
                if(final_transcript.trim() !== "") this.stop();
            }, 2000);
        };

        this.recognition.onerror = (e) => {
            console.error("Error:", e.error);
            this.reset();
        };

        this.recognition.onend = () => {
            if(this.isListening) this.recognition.start(); // कनेक्शन बनाए रखना
        };

        this.recognition.start();
    },

    stop: function() {
        this.isListening = false;
        if(this.recognition) this.recognition.stop();
        this.reset();
        // टाइप होने के बाद ऑटो-सेंड फंक्शन को कॉल करना
        setTimeout(() => {
            if(window.send && document.getElementById("inp").value.trim() !== "") {
                window.send();
            }
        }, 500);
    },

    reset: function() {
        this.isListening = false;
        const mic = document.getElementById("mic");
        mic.style.background = "#EC4899";
        mic.style.boxShadow = "none";
        mic.innerHTML = "🎙️";
        document.getElementById("sbar").textContent = "तैयार हूँ!";
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
