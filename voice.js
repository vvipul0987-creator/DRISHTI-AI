/**
 * DRISHTI AI - OMNI ENGINE V9.0 (PRO)
 * Developed for Vipul Verma | Ultra-Responsive Mode
 * No HTML changes required.
 */

(function() {
    // 1. FUTURE-FONT & CSS INJECTION (Automatic)
    const setupUI = () => {
        if (document.getElementById('drishti-pro-styles')) return;
        const head = document.head;
        
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap';
        fontLink.rel = 'stylesheet';
        head.appendChild(fontLink);

        const style = document.createElement('style');
        style.id = 'drishti-pro-styles';
        style.innerHTML = `
            body { font-family: 'Rajdhani', sans-serif !important; }
            #mic { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); font-family: 'Orbitron', sans-serif !important; cursor: pointer; }
            .mic-active { 
                background: radial-gradient(circle, #ff0000, #990000) !important;
                box-shadow: 0 0 30px rgba(255, 0, 0, 0.6) !important;
                transform: scale(1.15);
                animation: drishtiPulse 1.2s infinite ease-in-out;
            }
            @keyframes drishtiPulse {
                0% { box-shadow: 0 0 10px rgba(255, 0, 0, 0.5); }
                50% { box-shadow: 0 0 40px rgba(255, 0, 0, 0.8); }
                100% { box-shadow: 0 0 10px rgba(255, 0, 0, 0.5); }
            }
        `;
        head.appendChild(style);
    };

    window.DrishtiVoice = {
        isListening: false,
        recognition: null,
        silenceTimer: null,
        lastTranscript: "",

        init: function() {
            setupUI();
            const mic = document.getElementById("mic");
            if(mic) {
                mic.replaceWith(mic.cloneNode(true)); // Clean all old bugs
                const newMic = document.getElementById("mic");
                newMic.addEventListener("click", () => this.toggle());
                console.log("🚀 DRISHTI OMNI-ENGINE v9.0 ACTIVATED");
            }
        },

        toggle: function() {
            this.isListening ? this.stopAndSend(true) : this.start();
        },

        start: function() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if(!SR) return alert("System Error: Use Chrome or Safari");

            // iPhone/Safari Audio Force-Resume
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            this.recognition = new SR();
            this.recognition.lang = "hi-IN"; 
            this.recognition.continuous = true; 
            this.recognition.interimResults = true;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.lastTranscript = "";
                const mic = document.getElementById("mic");
                mic.classList.add("mic-active");
                mic.innerHTML = "🛑";
                document.getElementById("sbar").textContent = "सुन रही हूँ... बोलिए 🎙️";
            };

            this.recognition.onresult = (e) => {
                let interim = "";
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    if (e.results[i].isFinal) this.lastTranscript += e.results[i][0].transcript;
                    else interim += e.results[i][0].transcript;
                }
                
                const display = this.lastTranscript + interim;
                const inputField = document.getElementById("inp");
                if(inputField) inputField.value = display;

                // SMART AUTO-SWITCH: 1.8 सेकंड की शांति मतलब मैसेज सेंड
                clearTimeout(this.silenceTimer);
                this.silenceTimer = setTimeout(() => {
                    if(display.trim().length > 0) this.stopAndSend(true);
                }, 1800);
            };

            this.recognition.onend = () => {
                // अगर सिस्टम ने खुद बंद नहीं किया, तभी रीस्टार्ट (Error protection)
                if(this.isListening) this.recognition.start();
            };

            this.recognition.start();
        },

        stopAndSend: function(shouldSend) {
            this.isListening = false;
            clearTimeout(this.silenceTimer);
            
            if(this.recognition) {
                this.recognition.onend = null; // लूप तोड़ना (The Switch Logic)
                this.recognition.stop();
            }

            // UI रीसेट
            const mic = document.getElementById("mic");
            mic.classList.remove("mic-active");
            mic.innerHTML = "🎙️";
            document.getElementById("sbar").textContent = "तैयार हूँ!";

            if(shouldSend) {
                setTimeout(() => {
                    if(window.send && document.getElementById("inp").value.trim() !== "") {
                        window.send();
                    }
                }, 100);
            }
        }
    };

    document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
})();
