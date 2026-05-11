/**
 * DRISHTI AI — PRO MAX EDITION (GEMINI SENSE)
 * DEVELOPED FOR: VIPUL VERMA
 * CORE LOGIC: Auto-Silence Detection, Hard-Kill on Submit, Zero-Ghosting
 */

window.DrishtiVoice = {
    // 1. STATE MANAGEMENT (सिस्टम की स्थिति)
    state: "IDLE", // IDLE, LISTENING, PROCESSING
    mainEngine: null,
    wakeEngine: null,

    // 2. DEVICE INTELLIGENCE (तुम्हारे एप्पल इकोसिस्टम के लिए)
    device: {
        isApple: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    },

    init: function() {
        this.injectCoreStyles();
        this.initializeMicButton();
        
        if(!this.device.isApple) {
            this.startWakeWordEngine();
        } else {
            this.updateSystemUI("IDLE", "APPLE SYSTEM: TAP MIC 🎙️");
        }
        console.log("🔥 DRISHTI PRO MAX: GEMINI SENSE DEPLOYED");
    },

    injectCoreStyles: function() {
        if (document.getElementById('dr-promax-css')) return;
        const style = document.createElement('style');
        style.id = 'dr-promax-css';
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap');
            
            /* माइक के 3 जादुई रूप */
            #mic { transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); position: relative; }
            
            /* जब सुन रहा हो */
            .mic-listening { transform: scale(1.15); background: #ef4444 !important; box-shadow: 0 0 35px rgba(239, 68, 68, 0.8) !important; animation: breathe 1.2s infinite alternate; }
            
            /* जब प्रोसेस कर रहा हो (Gemini Sense) */
            .mic-processing { opacity: 0.4; pointer-events: none; transform: scale(0.9); filter: grayscale(100%); }
            
            @keyframes breathe { from { box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); } to { box-shadow: 0 0 40px rgba(239, 68, 68, 1); } }
            
            #sbar { font-family: 'Orbitron', sans-serif; font-size: 12px; letter-spacing: 1.5px; transition: color 0.3s; }
            #inp { font-family: 'Rajdhani', sans-serif; font-size: 18px; }
        `;
        document.head.appendChild(style);
    },

    initializeMicButton: function() {
        const micElement = document.getElementById("mic");
        if(!micElement) return;
        
        // पुराने इवेंट्स को जड़ से खत्म करने के लिए Clone
        const freshMic = micElement.cloneNode(true);
        micElement.replaceWith(freshMic);
        
        const tapLogic = (e) => {
            e.preventDefault();
            // अगर सिस्टम प्रोसेसिंग कर रहा है, तो बटन काम नहीं करेगा (Blocker)
            if(this.state === "PROCESSING") return;
            
            if(this.state === "LISTENING") {
                this.forceKillEngine(false); // मैन्युअल बंद
            } else {
                this.startMainEngine();
            }
        };

        freshMic.addEventListener("click", tapLogic);
        freshMic.addEventListener("touchstart", tapLogic, { passive: false });
    },

    // ==========================================
    // 🧠 THE "GEMINI SENSE" CORE ENGINE
    // ==========================================
    startMainEngine: function() {
        if(this.state !== "IDLE") return;
        this.stopWakeWordEngine(); // बैकग्राउंड कान बंद

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        this.mainEngine = new SR();
        this.mainEngine.lang = "hi-IN";
        
        // 💎 GEMINI LOGIC: 'continuous: false' 
        // इसका मतलब है सिस्टम सिर्फ एक वाक्य सुनेगा और खुद रुक जाएगा
        this.mainEngine.continuous = false; 
        this.mainEngine.interimResults = true;

        this.mainEngine.onstart = () => {
            this.state = "LISTENING";
            this.updateSystemUI("LISTENING", "🎙️ LISTENING (SPEAK NOW)...");
        };

        this.mainEngine.onresult = (e) => {
            if(this.state === "PROCESSING") return; // सुरक्षा चक्र

            let interimText = "";
            let finalText = "";

            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalText += e.results[i][0].transcript;
                } else {
                    interimText += e.results[i][0].transcript;
                }
            }

            const inputField = document.getElementById("inp");
            if(inputField) {
                inputField.value = finalText || interimText;
                inputField.style.color = finalText ? "#ffffff" : "#c084fc"; // पर्पल से वाइट
            }

            // अगर फाइनल रिजल्ट मिल गया, तो प्रोसेस में डालो
            if(finalText) {
                this.processAndSend(finalText);
            }
        };

        // 💎 GEMINI SENSE: Silence Detection
        // जैसे ही यूज़र बोलना बंद करेगा (चुप होगा), यह ट्रिगर होगा
        this.mainEngine.onspeechend = () => {
            if(this.state === "LISTENING") {
                this.updateSystemUI("PROCESSING", "⚙️ FINALIZING...");
                // माइक को सुनना बंद करने का आदेश
                try { this.mainEngine.stop(); } catch(err) {} 
            }
        };

        this.mainEngine.onerror = (e) => {
            console.log("Mic Error:", e.error);
            this.forceKillEngine(false);
        };

        this.mainEngine.onend = () => {
            // अगर कोई रिजल्ट नहीं मिला और माइक बंद हो गया
            if(this.state === "LISTENING") this.forceKillEngine(false);
        };

        try { this.mainEngine.start(); } catch(e) { this.forceKillEngine(false); }
    },

    // ==========================================
    // 🛡️ THE HARD-KILL & DISPATCH SYSTEM
    // ==========================================
    processAndSend: function(rawText) {
        // 1. स्टेट लॉक करो ताकि कोई और आवाज़ अंदर न आ सके
        this.state = "PROCESSING";

        // 2. ☠️ THE HARD KILL: इंजन के तार काट दो
        if(this.mainEngine) {
            this.mainEngine.onresult = null;
            this.mainEngine.onspeechend = null;
            this.mainEngine.onerror = null;
            this.mainEngine.onend = null;
            try { this.mainEngine.abort(); } catch(e) {} // हार्डवेयर लेवल कट
            this.mainEngine = null;
        }

        this.updateSystemUI("PROCESSING", "🚀 DISPATCHING TO DRISHTI...");

        // 3. टेक्स्ट की सफाई
        let cleanText = rawText.replace(/hey drishti/gi, "").replace(/drishti/gi, "").replace(/दृष्टि/g, "").trim();
        const inputField = document.getElementById("inp");
        if(inputField) inputField.value = cleanText;

        // 4. मैसेज सेंड करना (थोड़े से डिले के साथ ताकि UI अपडेट हो सके)
        setTimeout(() => {
            if(window.send && cleanText !== "") {
                window.send(); // तुम्हारी मेन चैट फाइल का फंक्शन
                
                // मैसेज जाने के बाद सिस्टम को वापस 'IDLE' करने का टाइमर
                // (जब तक जवाब नहीं आता, माइक लॉक रहेगा)
                setTimeout(() => {
                    this.resetSystem();
                }, 1500); 

            } else {
                this.resetSystem(); // अगर टेक्स्ट खाली था तो वापस नॉर्मल
            }
        }, 300);
    },

    forceKillEngine: function(isSuccess) {
        this.state = "PROCESSING";
        if(this.mainEngine) {
            try { this.mainEngine.abort(); } catch(e) {}
            this.mainEngine = null;
        }
        this.resetSystem();
    },

    resetSystem: function() {
        this.state = "IDLE";
        this.updateSystemUI("IDLE", this.device.isApple ? "TAP MIC TO SPEAK" : "READY: 'HEY DRISHTI'");
        if(!this.device.isApple) {
            setTimeout(() => this.startWakeWordEngine(), 500);
        }
    },

    // ==========================================
    // 🌟 WAKE WORD ENGINE (BACKGROUND LISTENER)
    // ==========================================
    startWakeWordEngine: function() {
        if(this.state !== "IDLE" || this.device.isApple) return;
        
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return;

        this.wakeEngine = new SR();
        this.wakeEngine.continuous = true;
        this.wakeEngine.lang = "hi-IN";

        this.wakeEngine.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase();
            if(transcript.includes("drishti") || transcript.includes("दृष्टि")) {
                this.startMainEngine();
            }
        };

        this.wakeEngine.onend = () => {
            if(this.state === "IDLE") setTimeout(() => this.startWakeWordEngine(), 1000);
        };

        try { this.wakeEngine.start(); } catch(e) {}
    },

    stopWakeWordEngine: function() {
        if(this.wakeEngine) {
            this.wakeEngine.onend = null;
            try { this.wakeEngine.abort(); } catch(e) {}
            this.wakeEngine = null;
        }
    },

    // ==========================================
    // 🎨 UI CONTROLLER
    // ==========================================
    updateSystemUI: function(uiState, statusMessage) {
        const micBtn = document.getElementById("mic");
        const statusBar = document.getElementById("sbar");
        
        if(micBtn) {
            micBtn.className = ""; // पुरानी क्लास हटाओ
            if(uiState === "LISTENING") micBtn.classList.add("mic-listening");
            if(uiState === "PROCESSING") micBtn.classList.add("mic-processing");
        }

        if(statusBar) {
            statusBar.textContent = statusMessage;
            if(uiState === "LISTENING") statusBar.style.color = "#ef4444"; // Red
            else if(uiState === "PROCESSING") statusBar.style.color = "#f59e0b"; // Orange/Yellow
            else statusBar.style.color = "#00f2ff"; // Cyan (Ready)
        }
    }
};

document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
