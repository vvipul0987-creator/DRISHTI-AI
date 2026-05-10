// voice.js — DRISHTI AI Voice Engine
// All logic isolated here. No index.html modifications required.

(() => {
  // =========================
  // DYNAMIC FONT + STYLE LOAD
  // =========================

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@400;500;600&family=Audiowide&family=Exo+2:wght@400;500;600&display=swap";

  document.head.appendChild(fontLink);

  const style = document.createElement("style");
  style.innerHTML = `
    :root{
      --drishti-primary:#00f7ff;
      --drishti-bg:#050816;
      --drishti-text:#ffffff;
    }

    body{
      background:var(--drishti-bg);
      color:var(--drishti-text);
      font-family:'Rajdhani',sans-serif;
    }

    .ai-title,
    .logo,
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

    .glow{
      text-shadow:0 0 10px #00f7ff;
    }
  `;

  document.head.appendChild(style);

  // =========================
  // SAFARI / iPAD AUDIO FIX
  // =========================

  let audioUnlocked = false;
  let audioContext = null;

  async function unlockAudio() {
    if (audioUnlocked) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;

      if (!AudioCtx) return;

      audioContext = new AudioCtx();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      audioUnlocked = true;

      console.log("🔊 AudioContext Resumed");
    } catch (err) {
      console.error("Audio Unlock Failed:", err);
    }
  }

  // Required for iOS Safari
  ["click", "touchstart"].forEach((eventName) => {
    document.addEventListener(
      eventName,
      unlockAudio,
      { once: true }
    );
  });

  // =========================
  // SPEECH RECOGNITION SETUP
  // =========================

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("SpeechRecognition not supported.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  // =========================
  // ELEMENT REFERENCES
  // =========================

  // Update these IDs if needed
  const inputBox =
    document.getElementById("messageInput") ||
    document.querySelector("textarea") ||
    document.querySelector("input");

  const micButton =
    document.getElementById("micBtn");

  // =========================
  // ENGINE STATE
  // =========================

  let isListening = false;

  let finalTranscript = "";
  let silenceTimer = null;

  // Prevent duplicate speech
  let lastProcessedResult = 0;

  // =========================
  // START LISTENING
  // =========================

  async function startListening() {
    if (isListening) return;

    await unlockAudio();

    finalTranscript = "";
    lastProcessedResult = 0;

    try {
      recognition.start();
      isListening = true;

      console.log("🎤 Listening...");
    } catch (err) {
      console.error("Recognition Start Error:", err);
    }
  }

  // =========================
  // HARD STOP (Ghost Mic Fix)
  // =========================

  function stopListening() {
    if (!isListening) return;

    clearTimeout(silenceTimer);

    try {
      // HARD-KILL FIX
      recognition.onend = null;

      recognition.stop();

      isListening = false;

      console.log("🛑 Mic Hard-Stopped");
    } catch (err) {
      console.error("Recognition Stop Error:", err);
    }
  }

  // =========================
  // SILENCE DETECTION
  // =========================

  function resetSilenceTimer() {
    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
      console.log("⏳ Silence Detected");

      stopListening();

      // AUTO SEND
      if (
        typeof window.send === "function" &&
        inputBox &&
        inputBox.value.trim() !== ""
      ) {
        window.send();
      }
    }, 1600);
  }

  // =========================
  // MAIN SPEECH HANDLER
  // =========================

  recognition.onresult = (event) => {
    let interimTranscript = "";

    // FIXED ECHO BUG
    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const transcript =
        event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }

    // FINAL OUTPUT
    const output =
      finalTranscript + interimTranscript;

    if (inputBox) {
      inputBox.value = output.trim();

      // Trigger framework reactivity
      inputBox.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    resetSilenceTimer();
  };

  // =========================
  // ERROR HANDLING
  // =========================

  recognition.onerror = (event) => {
    console.error(
      "Speech Recognition Error:",
      event.error
    );

    stopListening();
  };

  // =========================
  // SAFE ONEND
  // =========================

  recognition.onend = () => {
    isListening = false;

    console.log("🎤 Recognition Ended");
  };

  // =========================
  // BUTTON BINDING
  // =========================

  if (micButton) {
    micButton.addEventListener("click", () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });
  }

  // =========================
  // GLOBAL API
  // =========================

  window.DRISHTI_VOICE = {
    start: startListening,
    stop: stopListening,
    recognition,
  };

  console.log("🚀 DRISHTI AI Voice Engine Loaded");
})();
