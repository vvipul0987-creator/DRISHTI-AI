/**
 * ════════════════════════════════════════════════════════════════════════════════════════════════════
 * 🌌 DRISHTI QUANTUM LAYER — v50.0 (ULTIMATE RECURSION ENGINE)
 * ════════════════════════════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE: ATOMIC RECURSIVE STATE MACHINE (A.R.S.M)
 * PLATFORM: UNIVERSAL (IOS 16+, ANDROID, CHROME, SAFARI)
 * ════════════════════════════════════════════════════════════════════════════════════════════════════
 */

window.DrishtiQuantum = (function() {
    "use strict";

    // ── 1. SYSTEM KERNEL (THE CONSTITUTION) ──
    const KERNEL = {
        CONFIG: {
            IDLE_RECOVERY_MS: 1200,
            SILENCE_THRESHOLD: 1650,
            LOCKOUT_MS: 2500, // Anti-Echo Lock
            MAX_RETRY: Infinity
        },
        STATE: {
            IDLE: 0,
            WAKE: 1,
            LISTENING: 2,
            PROCESSING: 3,
            LOCKED: 4
        }
    };

    // ── 2. VIRTUAL SHADOW STATE (THE MEMORY) ──
    let _vss = {
        current: KERNEL.STATE.IDLE,
        engine: null,
        buffer: "",
        lastEvent: Date.now(),
        retryCount: 0,
        isApple: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    };

    // ── 3. HARDWARE INTERFACE (THE PHYSICAL LAYER) ──
    const Hardware = {
        getRecognition: () => {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return null;
            const instance = new SR();
            instance.lang = "hi-IN";
            instance.interimResults = true;
            // iOS fix: Continuous must be false for reliable ending on Apple
            instance.continuous = !_vss.isApple; 
            return instance;
        },

        // जड़ से खत्म करने वाला फंक्शन (To stop On/Off loop)
        purge: function() {
            if (_vss.engine) {
                _vss.engine.onstart = _vss.engine.onresult = _vss.engine.onerror = _vss.engine.onend = null;
                try { _vss.engine.abort(); _vss.engine.stop(); } catch(e) {}
                _vss.engine = null;
            }
        }
    };

    // ── 4. THE RECURSIVE ENGINE (THE LOGIC) ──
    const Core = {
        // --- WAKE WORD DAEMON (HAMESHA ON) ---
        bootWake: function() {
            if (_vss.current !== KERNEL.STATE.IDLE) return;
            
            Hardware.purge();
            _vss.engine = Hardware.getRecognition();
            if (!_vss.engine) return;

            _vss.current = KERNEL.STATE.WAKE;
            
            _vss.engine.onresult = (e) => {
                const transcript = Array.from(e.results)
                    .map(r => r[0].transcript.toLowerCase())
                    .join("");
                
                if (transcript.includes("drishti") || transcript.includes("दृष्टि")) {
                    this.transitionToMain();
                }
            };

            _vss.engine.onend = () => {
                if (_vss.current === KERNEL.STATE.WAKE) {
                    setTimeout(() => this.bootWake(), 800);
                }
            };

            _vss.engine.onerror = () => { this.rebootSystem(); };

            try { _vss.engine.start(); } catch(e) { this.rebootSystem(); }
        },

        // --- MAIN LISTENER (THE ACTION) ---
        transitionToMain: function() {
            _vss.current = KERNEL.STATE.LISTENING;
            Hardware.purge();
            
            if ("vibrate" in navigator) navigator.vibrate([40, 30, 40]);
            
            _vss.engine = Hardware.getRecognition();
            _vss.engine.onstart = () => {
                UI.update("🎙️ Sun rahi hoon...", "#DC2626", "active");
            };

            _vss.engine.onresult = (e) => {
                let interim = "";
                let final = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) final += e.results[i][0].transcript;
                    else interim += e.results[i][0].transcript;
                }

                _vss.buffer = final || interim;
                UI.drawInput(_vss.buffer, !!final);

                // Gemini Logic: Silence detection
                clearTimeout(_vss.debounce);
                _vss.debounce = setTimeout(() => {
                    if (_vss.buffer.trim() && _vss.current === KERNEL.STATE.LISTENING) {
                        this.executeDispatch(_vss.buffer);
                    }
                }, KERNEL.CONFIG.SILENCE_THRESHOLD);
            };

            _vss.engine.onend = () => {
                if (_vss.current === KERNEL.STATE.LISTENING && !_vss.isProcessing) {
                    this.rebootSystem();
                }
            };

            try { _vss.engine.start(); } catch(e) { this.rebootSystem(); }
        },

        // --- THE DISPATCHER (THE SENDER) ---
        executeDispatch: function(payload) {
            if (_vss.current === KERNEL.STATE.LOCKED) return;
            
            _vss.current = KERNEL.STATE.LOCKED;
            _vss.isProcessing = true;
            Hardware.purge();

            UI.update("🚀 Processing...", "#059669", "sending");

            // Apple Echo Protection (2 second buffer)
            setTimeout(() => {
                if (window.send && payload.trim()) {
                    window.send();
                }
                
                // Lockdown to prevent hearing its own voice
                setTimeout(() => {
                    _vss.isProcessing = false;
                    _vss.current = KERNEL.STATE.IDLE;
                    this.rebootSystem();
                }, KERNEL.CONFIG.LOCKOUT_MS);
            }, 400);
        },

        rebootSystem: function() {
            Hardware.purge();
            _vss.current = KERNEL.STATE.IDLE;
            _vss.buffer = "";
            UI.update("Ready! 'Hey Drishti' boliye", "#4B5563", "idle");
            setTimeout(() => this.bootWake(), 1000);
        }
    };

    // ── 5. UI ADAPTER (THE FACE) ──
    const UI = {
        update: (msg, col, mode) => {
            const s = document.getElementById("sbar");
            if(s) { s.textContent = msg; s.style.color = col; }
            const m = document.getElementById("mic");
            if(m) m.className = "mic-btn-quantum " + mode;
        },
        drawInput: (val, final) => {
            const i = document.getElementById("inp");
            if(i) { i.value = val; i.style.color = final ? "#fff" : "#A855F7"; }
        }
    };

    // ── 6. BOOTLOADER ──
    return {
        start: function() {
            console.log("%c DRISHTI QUANTUM LAYER v50 ONLINE ", "background:#7C3AED; color:#fff; padding:10px; font-weight:bold;");
            
            const btn = document.getElementById("mic");
            if(btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    if (_vss.current !== KERNEL.STATE.LISTENING) Core.transitionToMain();
                    else Core.executeDispatch(_vss.buffer);
                };
            }

            // CSS Injection for Quantum UI
            const style = document.createElement("style");
            style.innerHTML = `
                .mic-btn-quantum { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .mic-btn-quantum.active { transform: scale(1.2); box-shadow: 0 0 30px rgba(220, 38, 38, 0.6); background: #DC2626 !important; }
                .mic-btn-quantum.sending { opacity: 0.5; pointer-events: none; }
            `;
            document.head.appendChild(style);

            Core.bootWake();
        }
    };
})();

// Initialize
DrishtiQuantum.start();
