// voice.js — DRISHTI AI Master Voice Engine v5.0
// Fully Optimized for Android (Chrome) & iOS (Safari/iPhone/iPad)

window.DrishtiVoice = {
    isListening: false,
    recognition: null,

    init: function() {
        const mic = document.getElementById("mic");
        if(mic) {
            mic.removeAttribute("onclick");
            mic.addEventListener("click", () => this.toggle());
        }
        console.log("✅ DRISHTI Voice Engine v5.0 Ready!");
    },

    toggle: function() {
        if(this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    },

    start: function() {
        // 1. Browser Detection & Logic
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if(!SR) {
            alert("Aapka browser voice support nahi karta. Android Chrome ya iOS Safari use karein!");
            return;
        }

        // 2. iPhone/Safari Audio Context Fix (Crucial for iOS)
        if (window.AudioContext || window.webkitAudioContext) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        this.recognition = new SR();
        
        // 3. Perfect Hindi Support
        this.recognition.lang = "hi-IN"; 
        this.recognition.continuous = true; // लगातार सुनने के लिए
        this.recognition.interimResults = true; // लाइव टेक्स्ट दिखाने के लिए
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            const mic = document.getElementById("mic");
            if(mic) {
                mic.style.background = "#DC2626"; // Red when listening
                mic.style.boxShadow = "0 0 15px #DC2626";
                mic.textContent = "🛑";
            }
            document.getElementById("sbar").textContent = "Sun rahi hoon... boliye! 🎙";
        };

        this.recognition.onresult = (e) => {
            let currentText = "";
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    currentText += e.results[i][0].transcript;
                }
            }

            if(currentText.trim() !== "") {
                document.getElementById("inp").value = currentText;
                document.getElementById("sbar").textContent = `Suna: "${currentText}"`;
                
                // Auto-send with slight delay
                clearTimeout(this.sendTimeout);
                this.sendTimeout = setTimeout(() => {
                    if(window.send) {
                        window.send();
                        this.stop(); // सेंड करने के बाद माइक बंद
                    }
                }, 1000);
            }
        };

        this.recognition.onerror = (e) => {
            console.error("Voice Error:", e.error);
            if(e.error === "not-allowed") {
                alert("Mic permission block hai! Browser settings mein allow karein.");
            }
            this.reset();
        };

        this.recognition.onend = () => {
            this.reset();
        };

        try {
            this.recognition.start();
        } catch(err) {
            console.error("Start Error:", err);
            this.reset();
        }
    },

    stop: function() {
        if(this.recognition) {
            this.recognition.stop();
        }
        this.reset();
    },

    reset: function() {
        this.isListening = false;
        const mic = document.getElementById("mic");
        if(mic) {
            mic.style.background = "#EC4899"; // Original Pink
            mic.style.boxShadow = "none";
            mic.textContent = "🎙";
        }
        document.getElementById("sbar").textContent = "Ready!";
    }
};

// Auto Init on Page Load
document.addEventListener("DOMContentLoaded", () => {
    window.DrishtiVoice.init();
});
