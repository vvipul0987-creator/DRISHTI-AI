/**
 * DRISHTI AI - TRANSCENDENCE CORE v11.0
 * The Ultimate Voice Experience for Vipul Verma
 * Features: Zero-Echo, AI-Silence Detection, Fluid UI Injection
 */

(function() {
    // 1. DYNAMIC ASSET INJECTION (Protects your HTML/API)
    const injectAssets = () => {
        if (document.getElementById('drishti-core-assets')) return;
        
        // Futuristic Fonts
        const fonts = document.createElement('link');
        fonts.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;700&display=swap';
        fonts.rel = 'stylesheet';
        document.head.appendChild(fonts);

        // Ultimate Futuristic UI Styles
        const style = document.createElement('style');
        style.id = 'drishti-core-assets';
        style.innerHTML = `
            body { font-family: 'Rajdhani', sans-serif !important; letter-spacing: 0.5px; }
            #mic { 
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative; overflow: hidden;
            }
            /* AI Breathing Animation when active */
            .ai-active {
                background: linear-gradient(135deg, #ff0055, #7000ff) !important;
                box-shadow: 0 0 25px rgba(112, 0, 255, 0.6), 0 0 50px rgba(255, 0, 85, 0.4) !important;
                transform: scale(1.1) translateY(-3px);
                border: 2px solid rgba(255, 255, 255, 0.3) !important;
            }
            .ai-active::after {
                content: ''; position: absolute; width: 100%; height: 100%;
                top: 0; left: 0; background: rgba(255,255,255,0.2);
                border-radius: 50%; animation: ripple 1.5s infinite;
            }
            @keyframes ripple {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
            #sbar { font-family: 'Orbitron', sans-serif; color: #00f2ff; text-shadow: 0 0 5px #00f2ff; }
        `;
        document.head.appendChild(style);
    };

    window.DrishtiVoice = {
        isListening: false,
        recognition: null,
        silenceTimer: null,
        buffer: "", // सिर्फ पक्के शब्दों के लिए "तिजोरी"

        init: function() {
            injectAssets();
            const mic = document.getElementById("mic");
            if(mic) {
                // Remove all old listeners to fix the "Ghost" mic issue
                const freshMic = mic.cloneNode(true);
                mic.replaceWith(freshMic);
                freshMic.addEventListener("click", () => this.handleToggle());
            }
            console.log("🌌 DRISHTI Core v11.0: READY FOR COMMAND");
        },

        handleToggle: function() {
            if (this.isListening) {
                this.forceKill(true); // सेंड करो और बंद करो
            } else {
                this.activateEngine();
            }
        },

        activateEngine: function() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if(!SR) return alert("System incompatibility. Please use Chrome/Safari.");

            // Unlock Audio Context (iPad/iPhone Optimization)
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            this.recognition = new SR();
            this.recognition.lang = "hi-IN";
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.buffer = ""; 
                document.getElementById("mic").classList.add("ai-active");
                document.getElementById("mic").innerHTML = "<span>🛑</span>";
                document.getElementById("sbar").textContent = "AI LISTENING...";
                
                // प्रीमियम फील के लिए हल्का वाइब्रेशन (अगर फोन सपोर्ट करे)
                if (navigator.vibrate) navigator.vibrate(20);
            };

            this.recognition.onresult = (event) => {
                let interim = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        this.buffer += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                const input = document.getElementById("inp");
                if (input) {
                    // ZERO-ECHO LOGIC: पुराने शब्दों को दोबारा नहीं लिखना
                    input.value = (this.buffer + interim).trim();
                }

                // AI-SILENCE TRIGGER (1.6s of silence = Proceed)
                clearTimeout(this.silenceTimer);
                this.silenceTimer = setTimeout(() => {
                    if (input.value.length > 0) this.forceKill(true);
                }, 1600);
            };

            this.recognition.onerror = () => this.forceKill(false);
            
            // "Ghost Restart" को रोकने के लिए ऑन-एंड पर कड़ा नियंत्रण
            this.recognition.onend = () => {
                if (this.isListening) {
                    try { this.recognition.start(); } catch(e) {}
                }
            };

            this.recognition.start();
        },

        forceKill: function(shouldSend) {
            this.isListening = false;
            clearTimeout(this.silenceTimer);
            
            if (this.recognition) {
                this.recognition.onend = null; // स्विच कंडीशन: लूप तोड़ना
                this.recognition.stop();
            }

            const mic = document.getElementById("mic");
            mic.classList.remove("ai-active");
            mic.innerHTML = "🎙️";
            document.getElementById("sbar").textContent = "STANDBY";

            if (shouldSend) {
                setTimeout(() => {
                    const input = document.getElementById("inp");
                    if (window.send && input.value.trim() !== "") {
                        window.send();
                        input.value = ""; // मैसेज सेंड होते ही स्क्रीन साफ़
                        this.buffer = ""; 
                    }
                }, 150);
            }
        }
    };

    document.addEventListener("DOMContentLoaded", () => window.DrishtiVoice.init());
})();
