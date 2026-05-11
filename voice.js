/**
 * DRISHTI AI — VOICE ENGINE v9.0 (ABSOLUTE ZERO)
 * AUTHOR: VIPUL VERMA X GEMINI COLLABORATION
 * FEATURE: AUTO-KILL, GHOST-LOOP PROTECTION, IOS-OPTIMIZED
 */

window.DrishtiVoice = {
    isListening: false,
    isProcessing: false,
    recognition: null,
    wakeRecognition: null,
    
    // ब्राउज़र इंटेलिजेंस
    browser: {
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isAndroid: /android/i.test(navigator.userAgent)
    },

    init: function() {
        this.injectFuturisticStyles();
        this.setupMicButton();
        
        // Android के लिए Wake Word
        if(!this.browser.isIOS) {
            setTimeout(() => this.startWakeWord(), 2000);
            this.updateStatusBar("Drishti: Wake Word Active ✨", "#00f2ff");
        } else {
            this.updateStatusBar("Apple System: Tap to Speak 🎙", "#A855F7");
        }
        console.log("💎 DRISHTI v9.0 — FLAWLESS ENGINE DEPLOYED");
    },

    injectFuturisticStyles: function() {
        if (document.getElementById('drishti-v9-css')) return;
        const style = document.createElement('style');
        style.id = 'drishti-v9-css';
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap');
            #mic { transition: all 0.3s ease-in-out; position: relative; z-index: 10; }
            .mic-listening { transform: scale(1.15); box-shadow: 0 0 40px #DC2626 !important; background: #DC2626 !important; animation: pulse 1.5s infinite; }
            .mic-processing { transform: rotate(360deg); opacity: 0.5; pointer-events: none; }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(220, 38, 38, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }
            #sbar { font-family: 'Orbitron', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 5px currentColor; }
            #inp { font-family: 'Rajdhani', sans-serif; font-weight: 500; font-size: 18px; transition: color 0.3s ease; }
        `;
        document.head.appendChild(style);
    },

    setupMicButton: function() {
        const mic = document.getElementById("mic");
        if(!mic) return;
        
        const newMic = mic.cloneNode(true);
        mic.replaceWith(newMic);

        const handleAction = (e) => {
            e.preventDefault();
            if(this.isProcessing) return;
            this.isListening ? this.stopEngine(false) : this.startEngine();
        };

        newMic.addEventListener("click", handleAction);
        newMic.addEventListener("touchstart", handleAction, { passive: false });
    },

    startEngine: function() {
        if(this.isProcessing || this.isListening) return;
        this.stopWakeWord();

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        this.recognition = new SR();
        this.recognition.lang = "hi-IN";
        this.recognition.interimResults = true;
        this.recognition.continuous = false; // "One-Shot" मोड ताकि लूप न हो

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicUI("listening");
            this.updateStatusBar("🎙 LISTENING...", "#DC2626");
        };

        this.recognition.onresult = (e) => {
            let interim = "";
            let final = "";

            for (let i = e.resultIndex; i < e.results.length; i++) {
                const transcript = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += transcript;
                else interim += transcript;
            }

            const inp = document.getElementById("inp");
            if(inp) {
                inp.value = final || interim;
                inp.style.color = final ? "#ffffff" : "#A855F7";
            }

            if(final) {
                this.executeFinalSequence(final);
            }
        };

        this.recognition.onerror = () => this.resetEngine();
        this.recognition.onend = () => { if(!this.isProcessing) this.resetEngine(); };

        try { this.recognition.start(); } catch(e) { this.resetEngine(); }
    },

    executeFinalSequence: function(text) {
        this.isProcessing = true;
        this.isListening = false;

        // 🛡️ HARD-KILL LOGIC: यहाँ माइक का गला घोंट दिया जाता है
        if(this.recognition) {
            this.recognition.onresult = null;
            this.recognition.onend = null;
            this.recognition.onerror = null;
            try { this.recognition.abort(); } catch(err) {}
            this.recognition = null;
        }

        this.updateMicUI("processing");
        this.updateStatusBar("✅ DISPATCHING...", "#059669");

        // फिल्टर 'Wake Words'
        let cleanText = text.replace(/hey drishti/gi, "").replace(/drishti/gi, "").replace(/दृष्टि/g, "").trim();
        const inp = document.getElementById("inp");
        if(inp) inp.value = cleanText;

        // मुख्य सेंड फंक्शन को कॉल करें
        setTimeout(() => {
            if(window.send) {
                window.send();
                // 1.5s कूलडाउन ताकि सिस्टम जवाब के लिए तैयार रहे
                setTimeout(() => this.resetEngine(), 1500);
            } else {
                this.resetEngine();
            }
        }, 300);
    },

    stopEngine: function(shouldSend) {
        if(this.recognition) {
            try { this.recognition.stop(); } catch(e) {}
        }
        if(!shouldSend) this.resetEngine();
    },

    resetEngine: function() {
        this.isListening = false;
        this.isProcessing = false;
        this.updateMicUI("normal");
        this.updateStatusBar(this.browser.isIOS ? "TAP TO SPEAK" : "READY: 'HEY DRISHTI'", "#00f2ff");
        if(!this.browser.isIOS) this.startWakeWord();
    },

    startWakeWord: function() {
        if(this.browser.isIOS || this.isListening || this.isProcessing) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        this.wakeRecognition = new SR();
        this.wakeRecognition.lang = "hi-IN";
        this.wakeRecognition.continuous = true;
        
        this.wakeRecognition.onresult = (e) => {
            const text = e.results[e.results.length-1][0].transcript.toLowerCase();
            if(text.includes("drishti") || text.includes("दृष्टि")) {
                this.stopWakeWord();
                this.startEngine();
            }
        };
        
        this.wakeRecognition.onend = () => { if(!this.isListening) setTimeout(() => this.startWakeWord(), 1000); };
        try { this.wakeRecognition.start(); } catch(e) {}
    },

    stopWakeWord: function() {
        if(this.wakeRecognition) {
            this.wakeRecognition.onend = null;
            try { this.wakeRecognition.abort(); } catch(e) {}
            this.wakeRecognition = null;
        }
    },

    updateMicUI: function(state) {
        const mic = document.getElementById("mic");
        if(!mic) return;
        mic.className = ""; 
        if(state === "listening") {
            mic.classList.add("mic-listening");
            mic.innerHTML = "🔴";
        } else if(state === "processing") {
            mic.classList.add("mic-processing");
            mic.innerHTML = "🌀";
        } else {
            mic.innerHTML = "🎙";
        }
    },

    updateStatusBar: function(msg, color) {
        const s = document.getElementById("sbar");
        if(s) { s.textContent = msg; s.style.color = color; }
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
