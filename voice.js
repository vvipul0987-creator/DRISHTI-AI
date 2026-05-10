/*
========================================================
🚀 DRISHTI AI — FINAL UNIVERSAL VOICE ENGINE
========================================================

✅ Android Chrome Supported
✅ iPhone Safari Supported
✅ iPad Safari Supported
✅ Hindi + Hinglish + English
✅ No Duplicate Text
✅ No Double Response
✅ Auto Silence Send
✅ Stable Mic Handling
✅ Real Mobile Fixes
✅ Dynamic Styling
✅ Easy Copy-Paste

--------------------------------------------------------
REQUIRED HTML IDS
--------------------------------------------------------

<button id="micBtn"></button>

<textarea id="messageInput"></textarea>

OR

<input id="messageInput" />

--------------------------------------------------------
IMPORTANT
--------------------------------------------------------

1. Website MUST use HTTPS
2. Safari/iPhone will ask mic permission
3. Do NOT run using file://
4. Paste ONLY in voice.js

========================================================
*/

(() => {

  // ====================================================
  // PREVENT MULTIPLE LOADS
  // ====================================================

  if (window.__DRISHTI_LOADED__) return;

  window.__DRISHTI_LOADED__ = true;

  // ====================================================
  // GOOGLE FONTS
  // ====================================================

  const font = document.createElement("link");

  font.rel = "stylesheet";

  font.href =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Rajdhani:wght@400;500;600&family=Audiowide&family=Exo+2:wght@400;500;600&display=swap";

  document.head.appendChild(font);

  // ====================================================
  // STYLES
  // ====================================================

  const style = document.createElement("style");

  style.innerHTML = `

    body{
      font-family:'Rajdhani',sans-serif;
      -webkit-tap-highlight-color:transparent;
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

    #micBtn.listening{
      transform:scale(1.08);
      transition:0.25s ease;
      box-shadow:
      0 0 12px cyan,
      0 0 28px cyan;
    }

  `;

  document.head.appendChild(style);

  // ====================================================
  // SPEECH SUPPORT
  // ====================================================

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert(
      "Speech Recognition Not Supported"
    );

    return;
  }

  // ====================================================
  // ELEMENTS
  // ====================================================

  const micBtn =
    document.getElementById("micBtn");

  const inputBox =
    document.getElementById("messageInput") ||
    document.querySelector("textarea") ||
    document.querySelector("input");

  if (!micBtn) {

    console.error(
      "❌ micBtn not found"
    );

    return;
  }

  if (!inputBox) {

    console.error(
      "❌ messageInput not found"
    );

    return;
  }

  // ====================================================
  // AUDIO UNLOCK FOR IOS
  // ====================================================

  let audioUnlocked = false;

  async function unlockAudio() {

    if (audioUnlocked) return;

    try {

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext =
        new AudioContextClass();

      if (
        audioContext.state === "suspended"
      ) {
        await audioContext.resume();
      }

      audioUnlocked = true;

      console.log("🔊 Audio Unlocked");

    } catch (err) {

      console.error(
        "Audio Unlock Error:",
        err
      );
    }
  }

  // iOS Safari fix
  ["click", "touchstart"].forEach(evt => {

    document.addEventListener(
      evt,
      unlockAudio,
      { once: true }
    );

  });

  // ====================================================
  // RECOGNITION INSTANCE
  // ====================================================

  const recognition =
    new SpeechRecognition();

  recognition.lang = "hi-IN";

  recognition.continuous = false;

  recognition.interimResults = true;

  recognition.maxAlternatives = 1;

  // ====================================================
  // STATES
  // ====================================================

  let listening = false;

  let silenceTimer = null;

  let finalTranscript = "";

  let alreadySent = false;

  // ====================================================
  // START MIC
  // ====================================================

  async function startMic() {

    if (listening) return;

    try {

      // FORCE MIC PERMISSION
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      await unlockAudio();

      finalTranscript = "";

      alreadySent = false;

      recognition.start();

      listening = true;

      micBtn.classList.add(
        "listening"
      );

      console.log("🎤 Listening Started");

    } catch (err) {

      console.error(
        "Mic Start Error:",
        err
      );

      alert(
        "Microphone permission denied."
      );
    }
  }

  // ====================================================
  // STOP MIC
  // ====================================================

  function stopMic() {

    if (!listening) return;

    clearTimeout(silenceTimer);

    try {

      recognition.stop();

    } catch (err) {

      console.error(
        "Stop Error:",
        err
      );
    }

    listening = false;

    micBtn.classList.remove(
      "listening"
    );

    console.log("🛑 Mic Stopped");
  }

  // ====================================================
  // SILENCE DETECTION
  // ====================================================

  function startSilenceTimer() {

    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {

      stopMic();

      if (
        alreadySent ||
        !inputBox.value.trim()
      ) {
        return;
      }

      alreadySent = true;

      // AUTO SEND
      if (
        typeof window.send ===
        "function"
      ) {

        console.log(
          "📤 Auto Sending"
        );

        window.send();
      }

    }, 1600);
  }

  // ====================================================
  // RESULT HANDLER
  // ====================================================

  recognition.onresult = (event) => {

    let text = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      text +=
        event.results[i][0].transcript;
    }

    text = text.trim();

    // EMPTY BLOCK
    if (!text) return;

    // DUPLICATE BLOCK
    if (
      text.toLowerCase() ===
      finalTranscript.toLowerCase()
    ) {
      return;
    }

    finalTranscript = text;

    // UPDATE INPUT
    inputBox.value = text;

    inputBox.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

    startSilenceTimer();
  };

  // ====================================================
  // ERROR HANDLER
  // ====================================================

  recognition.onerror = (event) => {

    console.error(
      "Speech Recognition Error:",
      event.error
    );

    stopMic();
  };

  // ====================================================
  // END EVENT
  // ====================================================

  recognition.onend = () => {

    listening = false;

    micBtn.classList.remove(
      "listening"
    );

    console.log(
      "🎤 Recognition Ended"
    );
  };

  // ====================================================
  // BUTTON CLICK
  // ====================================================

  micBtn.addEventListener(
    "click",
    async () => {

      if (listening) {

        stopMic();

      } else {

        await startMic();

      }

    }
  );

  // ====================================================
  // GLOBAL API
  // ====================================================

  window.DRISHTI_VOICE = {

    start: startMic,

    stop: stopMic,

    recognition

  };

  console.log(
    "🚀 DRISHTI AI Voice Engine Ready"
  );

})();
