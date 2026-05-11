/**
 * DRISHTI AI — VERSION 11.0 (THE GEMINI CORE)
 * LOGIC: Automatic Endpointing, Silence Detection & Hard Abort
 * AUTHOR: VIPUL VERMA
 */

window.DrishtiVoice = {
    state: "IDLE",
    recognition: null,
    silenceTimer: null,
    SILENCE_THRESHOLD: 1500, // 1.5 सेकंड का सन्नाटा मतलब बात पूरी हो गई
    
    init: function() {
        this.injectGeminiUI();
        this.setupMic();
        console.log("💎 GEMINI CORE LOGIC DEPLOYED IN DRISHTI");
    },

    injectGeminiUI: function() {
        if (document.getElementById('gemini-logic-css')) return;
        const style = document.createElement('style');
        style.id = 'gemini-logic-css';
        style.innerHTML = `
            #mic { transition: all 0.3s ease; }
            .listening-pulse { animation: gemini-pulse 1.5s infinite; background: #ef4444 !important; }
            @keyframes gemini-pulse { 
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .processing-fade { opacity: 0.3; pointer-events: none; transform: scale(0.9); }
        `;
        document.head.appendChild(style);
    },

    setupMic: function() {
        const mic = document.getElementById("mic");
        if(!mic) return;
        const freshMic = mic.cloneNode(true);
        mic.replaceWith(freshMic);
        
        freshMic.addEventListener("click", (e) => {
            e.preventDefault();
            if(this.state === "IDLE") this.startListening();
            else if(this.state === "LISTENING") this.stopAndSend();
        });
    },

    // 🎙️ STEP 1: माइक शुरू करना
    startListening: function() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        this.recognition = new SR();
        this.recognition.lang = "hi-IN";
        this.recognition.interimResults = true;
        this.recognition.continuous = true; // हम इसे खुद बंद करेंगे लॉजिक से

        this.recognition.onstart = () => {
            this.state = "LISTENING";
            this.updateUI("listening", "Listening...");
        };

        this.recognition.onresult = (e) => {
            if(this.state !== "LISTENING") return;

            let transcript = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }

            const inp = document.getElementById("inp");
            if(inp) inp.value = transcript;

            // 🧠 GEMINI LOGIC: 'Silence Watchdog'
            // हर बार जब तुम कुछ बोलोगे, टाइमर रिसेट हो जाएगा। 
            // जैसे ही तुम 1.5 सेकंड के लिए रुकोगे, सिस्टम खुद 'stopAndSend' कर देगा।
            clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
                this.stopAndSend();
            }, this.SILENCE_THRESHOLD);
        };

        this.recognition.onerror = () => this.resetToIdle();
        this.recognition.start();
    },

    // 🧠 STEP 2: "The Gemini Sense" — ऑटोमैटिक स्टॉप और सेंड
    stopAndSend: function() {
        if(this.state !== "LISTENING") return;
        this.state = "PROCESSING";
        clearTimeout(this.silenceTimer);

        // ☠️ HARD-KILL: माइक को पूरी तरह शटडाउन करना
        if(this.recognition) {
            this.recognition.onresult = null;
            this.recognition.onend = null;
            try {
                this.recognition.stop();
                this.recognition.abort(); // कनेक्शन काटो
            } catch(e) {}
            this.recognition = null;
        }

        this.updateUI("processing", "✨ Processing...");

        // ⚡ AUTO-SUBMIT: खुद-ब-खुद सेंड बटन दबाना
        setTimeout(() => {
            const val = document.getElementById("inp").value;
            if(window.send && val.trim() !== "") {
                window.send(); 
                // सेंड होने के बाद 2 सेकंड का लॉक ताकि जवाब आ सके
                setTimeout(() => this.resetToIdle(), 2000);
            } else {
                this.resetToIdle();
            }
        }, 300);
    },

    resetToIdle: function() {
        this.state = "IDLE";
        this.updateUI("idle", "Tap Mic to Speak");
    },

    updateUI: function(mode, msg) {
        const mic = document.getElementById("mic");
        const sbar = document.getElementById("sbar");
        if(!mic || !sbar) return;

        mic.className = "";
        if(mode === "listening") mic.classList.add("listening-pulse");
        if(mode === "processing") mic.classList.add("processing-fade");
        
        sbar.textContent = msg;
        sbar.style.color = (mode === "listening") ? "#ef4444" : "#00f2ff";
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
