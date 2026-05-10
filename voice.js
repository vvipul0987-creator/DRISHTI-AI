/*
========================================================
🚀 DRISHTI AI — UNIVERSAL VOICE ENGINE
========================================================

✅ Android Chrome Stable
✅ iPhone Safari Stable
✅ iPad Safari Stable
✅ Hindi + Hinglish + English
✅ No Duplicate Transcript
✅ No Double AI Response
✅ Ghost Mic Fixed
✅ Silence Auto Send
✅ Smart Restart Protection
✅ Auto Audio Unlock
✅ Mobile Optimized
✅ Dynamic Fonts + Cyber UI
✅ Production Style Architecture

IMPORTANT:
Do NOT modify index.html
Just include this voice.js

Required IDs:
- #micBtn
- #messageInput

window.send() must exist

========================================================
*/

(() => {

  // ====================================================
  // PREVENT DOUBLE LOAD
  // ====================================================

  if (window.DRISHTI_VOICE_LOADED) {
    console.log("⚠️ Voice Engine Already Loaded");
    return;
  }

  window.DRISHTI_VOICE_LOADED = true;

  // ====================================================
  // GOOGLE FONTS
  // ====================================================

  const font = document.createElement("link");

  font.rel = "stylesheet";

  font.href =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Audiowide&family=Exo+2:wght@400;500;600&display=swap";

  document.head.appendChild(font);

  // ====================================================
  // CYBER STYLES
  // ====================================================

  const style = document.createElement("style");

  style.innerHTML = `

    :root{
      --drishti-primary:#00F0FF;
      --drishti-bg:#050816;
      --drishti-text:#ffffff;
    }

    body{
      background:var(--drishti-bg);
      color:var(--drishti-text);
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
        0 0 12px var(--drishti-primary),
        0 0 30px var(--drishti-primary);
    }

  `;

  document.head.appendChild(style);

  // ====================================================
  // AUDIO UNLOCK (iOS FIX)
  // ====================================================

  let audioUnlocked = false;

  async function unlockAudio() {

    if (audioUnlocked) return;

    try {

      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioCtx) return;

      const audioContext = new AudioCtx();

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

  ["touchstart", "click"].forEach(evt => {

    document.addEventListener(
      evt,
      unlockAudio,
      { once: true }
    );

  });

  // ====================================================
  // SPEECH RECOGNITION
  // ====================================================

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    console.error(
      "❌ Speech Recognition Unsupported"
    );

    alert(
      "Speech Recognition is not supported on this browser."
    );

    return;
  }

  const recognition =
    new SpeechRecognition();

  // ====================================================
  // UNIVERSAL CONFIG
  // ====================================================

  recognition.lang = "hi-IN";

  recognition.continuous = true;

  recognition.interimResults = true;

  recognition.maxAlternatives = 1;

  // ====================================================
  // ELEMENTS
  // ====================================================

  const inputBox =
    document.getElementById("messageInput") ||
    document.querySelector("textarea") ||
    document.querySelector("input");

  const micButton =
    document.getElementById("micBtn");

  // ====================================================
  // STATES
  // ====================================================

  let isListening = false;

  let silenceTimer = null;

  let alreadySent = false;

  let currentTranscript = "";

  let manualStop = false;

  let lastSpeechTime = 0;

  // ====================================================
  // START LISTENING
  // ====================================================

  async function startListening() {

    if (isListening) return;

    await unlockAudio();

    alreadySent = false;

    currentTranscript = "";

    manualStop = false;

    clearTimeout(silenceTimer);

    try {

      recognition.start();

      isListening = true;

      if (micButton) {
        micButton.classList.add(
          "listening"
        );
      }

      console.log(
        "🎤 DRISHTI Listening..."
      );

    } catch (err) {

      console.error(
        "Recognition Start Error:",
        err
      );

    }
  }

  // ====================================================
  // STOP LISTENING
  // ====================================================

  function stopListening() {

    if (!isListening) return;

    manualStop = true;

    clearTimeout(silenceTimer);

    try {

      recognition.stop();

    } catch (err) {

      console.error(
        "Recognition Stop Error:",
        err
      );

    }

    isListening = false;

    if (micButton) {
      micButton.classList.remove(
        "listening"
      );
    }

    console.log("🛑 Mic Stopped");
  }

  // ====================================================
  // SILENCE DETECTION
  // ====================================================

  function resetSilenceTimer() {

    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {

      stopListening();

      if (
        alreadySent ||
        !inputBox ||
        !inputBox.value.trim()
      ) {
        return;
      }

      alreadySent = true;

      // AUTO SEND
      if (
        typeof window.send === "function"
      ) {

        console.log(
          "📤 Auto Sending..."
        );

        window.send();
      }

    }, 1600);
  }

  // ====================================================
  // MAIN SPEECH ENGINE
  // ====================================================

  recognition.onresult = (event) => {

    let transcript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      const result =
        event.results[i];

      transcript +=
        result[0].transcript;
    }

    transcript = transcript.trim();

    // EMPTY BLOCK
    if (!transcript) return;

    // DUPLICATE PREVENTION
    if (
      transcript.toLowerCase() ===
      currentTranscript.toLowerCase()
    ) {
      return;
    }

    // RAPID DUPLICATE BLOCK
    const now = Date.now();

    if (
      now - lastSpeechTime < 400 &&
      transcript === currentTranscript
    ) {
      return;
    }

    lastSpeechTime = now;

    currentTranscript = transcript;

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

  // ====================================================
  // ERROR HANDLER
  // ====================================================

  recognition.onerror = (event) => {

    console.error(
      "Recognition Error:",
      event.error
    );

    // SAFARI RANDOM ERRORS IGNORE
    if (
      event.error === "no-speech" ||
      event.error === "aborted"
    ) {
      return;
    }

    stopListening();
  };

  // ====================================================
  // ON END
  // ====================================================

  recognition.onend = () => {

    isListening = false;

    if (micButton) {
      micButton.classList.remove(
        "listening"
      );
    }

    console.log(
      "🎤 Recognition Ended"
    );

    // AUTO RESTART PROTECTION
    if (!manualStop) {

      console.log(
        "🔄 Safe Restart..."
      );

      setTimeout(() => {

        if (!isListening) {

          try {

            recognition.start();

            isListening = true;

            if (micButton) {
              micButton.classList.add(
                "listening"
              );
            }

          } catch (err) {

            console.error(
              "Restart Failed:",
              err
            );

          }

        }

      }, 250);

    }
  };

  // ====================================================
  // BUTTON BINDING
  // ====================================================

  if (micButton) {

    micButton.addEventListener(
      "click",
      async () => {

        if (isListening) {

          stopListening();

        } else {

          await startListening();

        }

      }
    );
  }

  // ====================================================
  // GLOBAL API
  // ====================================================

  window.DRISHTI_VOICE = {

    start: startListening,

    stop: stopListening,

    recognition,

    version: "DRISHTI UNIVERSAL 1.0"

  };

  console.log(
    "🚀 DRISHTI AI Universal Voice Engine Loaded"
  );

})();
