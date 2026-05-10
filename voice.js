/*
========================================
🚀 DRISHTI AI - ULTIMATE VOICE ENGINE
========================================
Features:
✅ Hindi + Hinglish Support
✅ Duplicate Prevention
✅ Ghost Mic Fix
✅ Silence Auto Send
✅ iOS Safari Stable
✅ Smart Transcript Engine
✅ Dynamic Fonts + Styles
✅ Hard Kill Recognition
========================================
*/

(() => {

  // ====================================
  // GOOGLE FONTS INJECTION
  // ====================================

  const font = document.createElement("link");

  font.rel = "stylesheet";

  font.href =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@400;500;600&family=Audiowide&family=Exo+2:wght@400;500;600&display=swap";

  document.head.appendChild(font);

  // ====================================
  // DRISHTI CYBER STYLES
  // ====================================

  const style = document.createElement("style");

  style.innerHTML = `
  
    body{
      font-family:'Rajdhani',sans-serif;
      background:#050816;
      color:white;
    }

    .ai-title,
    .btn-ai{
      font-family:'Orbitron',sans-serif;
    }

    .cyberpunk{
      font-family:'Audiowide',cursive;
    }

    input,
    textarea{
      font-family:'Exo 2',sans-serif;
    }

  `;

  document.head.appendChild(style);

  // ====================================
  // AUDIO CONTEXT FIX FOR iOS
  // ====================================

  let audioUnlocked = false;
  let audioContext = null;

  async function unlockAudio() {

    if (audioUnlocked) return;

    try {

      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioCtx) return;

      audioContext = new AudioCtx();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      audioUnlocked = true;

      console.log("🔊 Audio Unlocked");

    } catch (err) {

      console.error("Audio Unlock Failed", err);

    }
  }

  ["click", "touchstart"].forEach(event => {

    document.addEventListener(
      event,
      unlockAudio,
      { once: true }
    );

  });

  // ====================================
  // SPEECH RECOGNITION SETUP
  // ====================================

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    console.error(
      "❌ Speech Recognition Not Supported"
    );

    return;
  }

  const recognition =
    new SpeechRecognition();

  // ====================================
  // BEST CONFIG
  // ====================================

  recognition.continuous = false;

  recognition.interimResults = true;

  recognition.lang = "hi-IN";

  recognition.maxAlternatives = 1;

  // ====================================
  // DOM ELEMENTS
  // ====================================

  const inputBox =
    document.getElementById("messageInput") ||
    document.querySelector("textarea") ||
    document.querySelector("input");

  const micButton =
    document.getElementById("micBtn");

  // ====================================
  // ENGINE STATES
  // ====================================

  let isListening = false;

  let silenceTimer = null;

  let alreadySent = false;

  let lastTranscript = "";

  // ====================================
  // START LISTENING
  // ====================================

  async function startListening() {

    if (isListening) return;

    await unlockAudio();

    alreadySent = false;

    lastTranscript = "";

    clearTimeout(silenceTimer);

    try {

      recognition.start();

      isListening = true;

      console.log("🎤 Listening Started");

    } catch (err) {

      console.error(
        "Recognition Start Error",
        err
      );

    }
  }

  // ====================================
  // HARD STOP FIX
  // ====================================

  function stopListening() {

    if (!isListening) return;

    clearTimeout(silenceTimer);

    try {

      // GHOST MIC FIX
      recognition.onend = null;

      recognition.abort();

      recognition.stop();

      isListening = false;

      console.log("🛑 Mic Stopped");

    } catch (err) {

      console.error(
        "Recognition Stop Error",
        err
      );

    }
  }

  // ====================================
  // AUTO SEND AFTER SILENCE
  // ====================================

  function resetSilenceTimer() {

    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {

      console.log("⏳ Silence Detected");

      stopListening();

      if (
        alreadySent ||
        !inputBox ||
        !inputBox.value.trim()
      ) {
        return;
      }

      alreadySent = true;

      // SEND MESSAGE
      if (typeof window.send === "function") {

        window.send();

        console.log("📤 Message Sent");

      }

    }, 1600);
  }

  // ====================================
  // MAIN VOICE ENGINE
  // ====================================

  recognition.onresult = (event) => {

    let transcript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      transcript +=
        event.results[i][0].transcript;

    }

    transcript = transcript.trim();

    // DUPLICATE FIX
    if (
      transcript.toLowerCase() ===
      lastTranscript.toLowerCase()
    ) {
      return;
    }

    lastTranscript = transcript;

    // UPDATE INPUT
    if (inputBox) {

      inputBox.value = transcript;

      inputBox.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );

    }

    resetSilenceTimer();
  };

  // ====================================
  // ERROR HANDLING
  // ====================================

  recognition.onerror = (event) => {

    console.error(
      "Speech Recognition Error:",
      event.error
    );

    stopListening();
  };

  // ====================================
  // SAFE ON END
  // ====================================

  recognition.onend = () => {

    isListening = false;

    console.log("🎤 Recognition Ended");
  };

  // ====================================
  // MIC BUTTON BINDING
  // ====================================

  if (micButton) {

    micButton.addEventListener(
      "click",
      () => {

        if (isListening) {

          stopListening();

        } else {

          startListening();

        }

      }
    );
  }

  // ====================================
  // GLOBAL ACCESS
  // ====================================

  window.DRISHTI_VOICE = {

    start: startListening,

    stop: stopListening,

    recognition

  };

  console.log(
    "🚀 DRISHTI AI Voice Engine Ready"
  );

})();
