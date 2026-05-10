// voice.js — DRISHTI "Ultra-Responsive" AI Engine v6.0
// Supercharged for iOS Safari & Android Chrome

// 1. Auto-Inject Pulse Animation (तुम्हें CSS नहीं छेड़नी पड़ेगी)
const style = document.createElement('style');
style.innerHTML = `
@keyframes aiPulse {
    0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(220, 38, 38, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}`;
document.head.appendChild(style);

window.DrishtiVoice = {
    isListening: false,
    recognition: null,
    silenceTimer: null,

    init: function() {
        const mic = document.getElementById("mic");
        if(mic) {
            mic.replaceWith(mic.cloneNode(true)); // पुराने बग्स को साफ़ करना
            document.getElementById("mic").addEventListener("click", () => this.toggle());
        }
    },

    toggle: function() {
        this.isListening ? this.stop(true) : this.start();
    },

    start: function() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return alert("System Error: Browser Speech Engine Missing!");

        // 🟢 AI Interrupt: अगर DRISHTI बोल रही है, तो उसे तुरंत चुप कराओ
        if(window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        // 🟢 iOS Wake Lock: सफारी के ऑडियो इंजन को जगाना
        if (window.AudioContext || window.webkitAudioContext) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        }

        this.recognition = new SR();
        this.recognition.lang = "hi-IN"; 
        this.recognition.continuous = true; 
        this.recognition.interimResults = true; // ⚡ लाइव टाइपिंग

        this.recognition.onstart = () => {
            this.isListening = true;
            const mic = document.getElementById("mic");
            mic.style.background = "#DC2626"; // गहरा लाल
            mic.style.animation = "aiPulse 1.5s infinite"; // असली धड़कन
            mic.innerHTML = "<span>🛑</span>"; // स्टॉप बटन
            document.getElementById("sbar").textContent = "सुन रही हूँ... 🎙️";
        };

        this.recognition.onresult = (e) => {
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    final_transcript += e.results[i][0].transcript;
                } else {
                    interim_transcript += e.results[i][0].transcript;
                }
            }

            // ⚡ स्मूथ लाइव टाइपिंग: जो बोला, वो तुरंत स्क्रीन पर
            const liveText = final_transcript + interim_transcript;
            const inputField = document.getElementById("inp");
            if(inputField) {
                inputField.value = liveText;
            }

            // 🧠 स्मार्ट ह्यूमन थिंकिंग टाइम (2.5 सेकंड)
            clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
                if(inputField.value.trim().length > 1) {
                    this.stop(false); // ऑटो-सेंड ट्रिगर
                }
            }, 2500); 
        };

        this.recognition.onend = () => {
            // 🛡️ iOS Self-Healing: अगर माइक गलती से कटा, तो खुद ऑन हो जाएगा
            if(this.isListening) {
                try { this.recognition.start(); } catch(e) {}
            }
        };

        this.recognition.onerror = (e) => {
            if(e.error !== 'no-speech') console.error("Mic Error:", e.error);
        };

        try {
            this.recognition.start();
        } catch(e) {
            console.error("Start blocked:", e);
        }
    },

    stop: function(manualTap = false) {
        this.isListening = false;
        if(this.recognition) this.recognition.stop();
        clearTimeout(this.silenceTimer);
        this.resetUI();
        
        // 🚀 सेंड करने का लॉजिक
        setTimeout(() => {
            const inputField = document.getElementById("inp");
            if(window.send && inputField && inputField.value.trim() !== "") {
                window.send();
            }
        }, 100);
    },

    resetUI: function() {
        this.isListening = false;
        const mic = document.getElementById("mic");
        mic.style.background = "#EC4899"; // वापस पिंक
        mic.style.animation = "none";
        mic.innerHTML = "🎙️";
        document.getElementById("sbar").textContent = "तैयार हूँ!";
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
