// voice.js — DRISHTI Auto-Switch Engine v8.0
window.DrishtiVoice = {
    isListening: false,
    recognition: null,
    silenceTimer: null,
    autoStopTimeout: 1500, // बोलना बंद करने के बाद 1.5 सेकंड का इंतज़ार

    init: function() {
        const mic = document.getElementById("mic");
        if(mic) {
            mic.replaceWith(mic.cloneNode(true)); 
            document.getElementById("mic").addEventListener("click", () => this.toggle());
        }
        console.log("⚡ Auto-Switch Engine Activated!");
    },

    toggle: function() {
        this.isListening ? this.hardStop() : this.start();
    },

    start: function() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        // Safari Audio Fix
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
            let transcript = "";
            for (let i = 0; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }

            const inputField = document.getElementById("inp");
            if(inputField) inputField.value = transcript;

            // 🧠 स्विच कंडीशन: जैसे ही बोलना बंद करोगे, टाइमर शुरू होगा
            clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
                if(transcript.trim().length > 0) {
                    this.hardStop(true); // ऑटोमेटिक बंद और सेंड
                }
            }, this.autoStopTimeout);
        };

        this.recognition.onerror = () => this.hardStop(false);
        
        // सबसे ज़रूरी: ऑन-एंड पर खुद को दोबारा शुरू करने से रोकना
        this.recognition.onend = () => {
            if (this.isListening) {
                // यह तभी चलेगा अगर एरर से बंद हुआ हो, सेंड होने पर नहीं
                this.updateUI(false);
                this.isListening = false;
            }
        };

        this.recognition.start();
    },

    hardStop: function(shouldSend = false) {
        // 1. स्टेट को तुरंत बंद करें
        this.isListening = false;
        clearTimeout(this.silenceTimer);

        // 2. रिकग्निशन को पूरी तरह से नष्ट (Destroy) करें
        if(this.recognition) {
            this.recognition.onend = null; // लूप तोड़ना
            this.recognition.stop();
        }

        // 3. UI रीसेट
        this.updateUI(false);

        // 4. सेंड लॉजिक
        if(shouldSend) {
            setTimeout(() => {
                const inputField = document.getElementById("inp");
                if(window.send && inputField.value.trim() !== "") {
                    window.send();
                    inputField.value = ""; 
                }
            }, 200);
        }
    },

    updateUI: function(active) {
        const mic = document.getElementById("mic");
        const sbar = document.getElementById("sbar");
        if(active) {
            mic.style.background = "#DC2626";
            mic.innerHTML = "<span>🛑</span>";
            sbar.textContent = "सुन रही हूँ...";
        } else {
            mic.style.background = "#EC4899";
            mic.innerHTML = "🎙️";
            sbar.textContent = "तैयार हूँ!";
        }
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
