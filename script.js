document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const chatContainer = document.getElementById("chat-container");
  const statusLight = document.getElementById("status-light");
  const statusGlow = document.getElementById("status-glow");
  const statusText = document.getElementById("status-text");
  const listeningIndicator = document.getElementById("listening-indicator");
  const speakingIndicator = document.getElementById("speaking-indicator");
  const micBtn = document.getElementById("mic-btn");
  const micIcon = document.getElementById("mic-icon");
  const stopSpeechBtn = document.getElementById("stop-speech-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettings = document.getElementById("close-settings");
  const saveSettings = document.getElementById("save-settings");
  const testVoice = document.getElementById("test-voice");
  const voiceSelect = document.getElementById("voice-select");
  const speechRate = document.getElementById("speech-rate");
  const rateValue = document.getElementById("rate-value");
  const speechPitch = document.getElementById("speech-pitch");
  const pitchValue = document.getElementById("pitch-value");

  // App Configuration
  const config = {
    wakeWord: "jarvis",
    sleepCommand: "go to sleep",
    stopCommand: "stop speaking",
    aiModel: "gemini-2.0-flash",
    defaultSearchEngine: "https://www.google.com/search?q=",
    defaultWebsitePrefix: "https://www.",
    defaultWebsiteSuffix: ".com",
    micReactivationDelay: 2000, // 2 seconds delay after AI speaks
  };

  // App State
  let isActive = false;
  let isListening = false;
  let recognition;
  let isSpeaking = false;
  const synth = window.speechSynthesis;

  // Voice Settings
  let voiceSettings = {
    voiceType: "default",
    rate: 1,
    pitch: 1,
  };

  // Load saved settings from localStorage
  function loadSettings() {
    const savedSettings = localStorage.getItem("jarvisVoiceSettings");
    if (savedSettings) {
      voiceSettings = JSON.parse(savedSettings);
      voiceSelect.value = voiceSettings.voiceType;
      speechRate.value = voiceSettings.rate;
      speechPitch.value = voiceSettings.pitch;
      updateRateValue();
      updatePitchValue();
    }
  }

  // Save settings to localStorage
  function saveVoiceSettings() {
    voiceSettings = {
      voiceType: voiceSelect.value,
      rate: parseFloat(speechRate.value),
      pitch: parseFloat(speechPitch.value),
    };
    localStorage.setItem("jarvisVoiceSettings", JSON.stringify(voiceSettings));
    showToast("Settings saved successfully");
  }

  // Update rate display value
  function updateRateValue() {
    const rate = parseFloat(speechRate.value);
    if (rate < 0.8) {
      rateValue.textContent = "Slow";
    } else if (rate > 1.2) {
      rateValue.textContent = "Fast";
    } else {
      rateValue.textContent = "Normal";
    }
  }

  // Update pitch display value
  function updatePitchValue() {
    const pitch = parseFloat(speechPitch.value);
    if (pitch < 0.8) {
      pitchValue.textContent = "Low";
    } else if (pitch > 1.2) {
      pitchValue.textContent = "High";
    } else {
      pitchValue.textContent = "Normal";
    }
  }

  // Show toast notification
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fadeInOut";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Enhanced AI Response Formatting
  function formatAIResponse(text) {
    // Clean up markdown and special characters
    text = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/#/g, "")
      .replace(/---/g, "")
      .replace(/_{2,}/g, "");

    // Convert to beautiful interactive HTML
    let formatted = text
      // Headers
      .replace(/^(.*?)\n[-=]{2,}\n/gm, '<h2 class="neon-header">$1</h2>')
      // Lists
      .replace(/^\s*[-•*]\s+(.*$)/gm, '<li class="glow-item">$1</li>')
      // Numbered lists
      .replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="numbered-item">$1</li>')
      // Quotes
      .replace(/^>\s*(.*$)/gm, '<blockquote class="neon-quote">$1</blockquote>')
      // Code blocks
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="code-block"><code>$1</code></pre>'
      )
      // Line breaks
      .replace(/\n/g, "<br>");

    // Wrap lists
    formatted = formatted.replace(
      /(<li class="glow-item">.*?<\/li>(<br>)?)+/g,
      '<ul class="glow-list">$&</ul>'
    );
    formatted = formatted.replace(
      /(<li class="numbered-item">.*?<\/li>(<br>)?)+/g,
      '<ol class="numbered-list">$&</ol>'
    );

    // Add interactive elements
    formatted = formatted
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" class="neon-link" target="_blank">$1 <i class="fas fa-external-link-alt"></i></a>'
      )
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" class="neon-link" target="_blank">$1 <i class="fas fa-external-link-alt"></i></a>'
      );

    // Add animated dividers between sections
    formatted = formatted.replace(
      /<br><br>/g,
      '</p><div class="divider"><div class="divider-line"></div></div><p>'
    );

    return `<div class="ai-message-content">${formatted}</div>`;
  }

  // Initialize
  micBtn.addEventListener("click", toggleVoiceRecognition);
  stopSpeechBtn.addEventListener("click", stopSpeaking);
  settingsBtn.addEventListener("click", openSettings);
  closeSettings.addEventListener("click", closeSettingsModal);
  saveSettings.addEventListener("click", saveVoiceSettings);
  testVoice.addEventListener("click", testVoiceSettings);
  speechRate.addEventListener("input", updateRateValue);
  speechPitch.addEventListener("input", updatePitchValue);

  // Load settings when page loads
  loadSettings();

  // Handle page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isListening) {
      // Page regained focus, restart mic if it was active
      setTimeout(() => {
        stopVoiceRecognition();
        startVoiceRecognition();
      }, 500);
    }
  });

  // Functions
  function toggleVoiceRecognition() {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }

  function startVoiceRecognition() {
    // Don't start if we're currently speaking
    if (isSpeaking) {
      return;
    }

    try {
      // Stop any existing recognition
      if (recognition) {
        recognition.stop();
      }

      recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isListening = true;
        micIcon.className = "fas fa-microphone-slash text-xl";
        listeningIndicator.classList.remove("hidden");
        micBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
        micBtn.classList.add("neon-btn-danger");

        // Add visual feedback
        micBtn.classList.add("animate-pulse");
      };

      recognition.onresult = (event) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript.trim();
        addMessage("user", transcript);
        processCommand(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech" || event.error === "audio-capture") {
          // These errors might occur when switching tabs, try to restart
          setTimeout(() => {
            if (isListening) {
              recognition.start();
            }
          }, 500);
        } else {
          stopVoiceRecognition();
        }
      };

      recognition.onend = () => {
        if (isListening && !isSpeaking) {
          // Only restart if we're supposed to be listening and not speaking
          setTimeout(() => {
            if (isListening && !isSpeaking) {
              recognition.start();
            }
          }, 100);
        }
      };

      recognition.start();
    } catch (error) {
      console.error("Speech recognition not supported:", error);
      addMessage(
        "assistant",
        "Speech recognition is not supported in your browser."
      );
    }
  }

  function stopVoiceRecognition() {
    if (recognition) {
      recognition.stop();
    }
    isListening = false;
    micIcon.className = "fas fa-microphone text-xl";
    listeningIndicator.classList.add("hidden");
    micBtn.classList.remove("neon-btn-danger");
    micBtn.classList.add("neon-btn");

    // Remove visual feedback
    micBtn.classList.remove("animate-pulse");
  }

  function processCommand(command) {
    const lowerCommand = command.toLowerCase();

    // Check for stop speaking command
    if (lowerCommand.includes(config.stopCommand)) {
      stopSpeaking();
      return;
    }

    // Check for wake word
    if (lowerCommand.includes(config.wakeWord)) {
      if (!isActive) {
        isActive = true;
        statusLight.className = "w-3 h-3 rounded-full bg-green-500";
        statusGlow.classList.add("opacity-100");
        setTimeout(() => {
          statusGlow.classList.remove("opacity-100");
        }, 1000);
        statusText.textContent = "Active";
        const response = `Yes, I'm listening. How can I help you?`;
        addMessage("assistant", response);
        speak(response);
      }
      return;
    }

    // Check for sleep command
    if (lowerCommand.includes(config.sleepCommand)) {
      if (isActive) {
        isActive = false;
        statusLight.className = "w-3 h-3 rounded-full bg-gray-500";
        statusText.textContent = "Sleeping";
        const response = `Going to sleep. Say "${config.wakeWord}" to wake me up again.`;
        addMessage("assistant", response);
        speak(response);
        // Automatically close mic when going to sleep
        if (isListening) {
          stopVoiceRecognition();
        }
      }
      return;
    }

    // Check for YouTube song command
    if (
      (lowerCommand.includes("play") || lowerCommand.includes("open")) &&
      (lowerCommand.includes("song") || lowerCommand.includes("music"))
    ) {
      const songQuery = command.replace(/play|open|song|music/gi, "").trim();
      openYoutubeSong(songQuery);
      return;
    }

    // Check for YouTube command
    if (lowerCommand.includes("open youtube")) {
      openWebsite("youtube.com");
      return;
    }

    // Check for website opening command
    if (lowerCommand.includes("open")) {
      const websiteName = extractWebsiteName(command);
      if (websiteName) {
        openWebsite(websiteName);
      } else {
        addMessage("assistant", "Please specify a website name to open.");
      }
      return;
    }

    // Process normal command if active
    if (isActive) {
      getAIResponse(command);
    } else {
      addMessage(
        "assistant",
        `I'm currently sleeping. Say "${config.wakeWord}" to wake me up.`
      );
    }
  }

  function extractWebsiteName(command) {
    // Remove the "open" keyword and trim
    const cleanCommand = command.toLowerCase().replace("open", "").trim();

    // Extract the first word after "open"
    const websiteName = cleanCommand.split(/\s+/)[0];

    // If it's a common website with a different domain, handle it
    if (websiteName === "google") return "google.com";
    if (websiteName === "facebook") return "facebook.com";
    if (websiteName === "twitter") return "twitter.com";
    if (websiteName === "instagram") return "instagram.com";

    return websiteName;
  }

  function openYoutubeSong(songName) {
    const encodedSong = encodeURIComponent(songName);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedSong}`;
    addMessage("assistant", `Searching YouTube for: ${songName}`);
    window.open(youtubeUrl, "_blank");
  }

  function openWebsite(websiteName) {
    // Temporarily stop listening while opening website
    const wasListening = isListening;
    if (wasListening) {
      stopVoiceRecognition();
    }

    // Clean the website name
    websiteName = websiteName.toLowerCase().trim();

    // Remove common prefixes/suffixes if present
    websiteName = websiteName.replace(/^https?:\/\//, "");
    websiteName = websiteName.replace(/^www\./, "");
    websiteName = websiteName.replace(/\/$/, "");

    // Try to construct the URL
    let websiteUrl;

    // Check if it's a known domain with special handling
    if (websiteName.includes(".")) {
      // If it already has a domain extension
      websiteUrl = `https://www.${websiteName}`;
    } else {
      // Default to .com
      websiteUrl = `https://www.${websiteName}.com`;
    }

    addMessage("assistant", `Opening ${websiteName}`);

    // Open website in new tab
    const newWindow = window.open(websiteUrl, "_blank");

    // Restore mic state after a delay
    if (wasListening) {
      setTimeout(() => {
        if (!isListening) {
          startVoiceRecognition();
        }
      }, 1000);
    }
  }

  async function getAIResponse(query) {
    try {
      // Add thinking message with typing indicator
      const thinkingId = addMessage(
        "assistant",
        `
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `,
        true
      );

      const response = await puter.ai.chat(query, {
        model: config.aiModel,
        stream: true,
      });

      // Remove thinking message
      removeMessage(thinkingId);

      // Create new message for streaming response
      const messageId = addMessage("assistant", "", true);
      const responseElement = document
        .getElementById(`msg-${messageId}`)
        .querySelector(".msg-content");

      let fullResponse = "";
      for await (const part of response) {
        if (part?.text) {
          fullResponse += part.text;
          responseElement.innerHTML = `<div class="ai-response">${formatAIResponse(
            fullResponse
          )}</div>`;
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }

      speak(fullResponse);
    } catch (error) {
      console.error("AI Error:", error);
      addMessage(
        "assistant",
        "Sorry, I encountered an error processing your request."
      );
    }
  }

  function stopSpeaking() {
    if (synth.speaking) {
      synth.cancel();
      isSpeaking = false;
      speakingIndicator.classList.add("hidden");
      stopSpeechBtn.classList.add("hidden");
      addMessage("assistant", "Speech stopped.");

      // Restart mic if it was active
      if (isListening) {
        setTimeout(() => {
          startVoiceRecognition();
        }, config.micReactivationDelay);
      }
    }
  }

  function speak(text) {
    if (synth.speaking) {
      synth.cancel();
    }

    // Stop listening while speaking
    const wasListening = isListening;
    if (wasListening) {
      stopVoiceRecognition();
    }

    isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;

    // Find the appropriate voice
    const voices = synth.getVoices();
    let selectedVoice = null;

    if (voices.length > 0) {
      if (voiceSettings.voiceType === "male") {
        // Prefer male voices
        selectedVoice = voices.find(
          (v) =>
            v.name.includes("Male") ||
            v.name.includes("male") ||
            v.name.includes("David") ||
            v.name.includes("Alex")
        );
      } else if (voiceSettings.voiceType === "female") {
        // Prefer female voices
        selectedVoice = voices.find(
          (v) =>
            v.name.includes("Female") ||
            v.name.includes("female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Zira") ||
            v.name.includes("Karen")
        );
      }

      // Fallback to default voice if no match found
      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.default) || voices[0];
      }

      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      speakingIndicator.classList.remove("hidden");
      stopSpeechBtn.classList.remove("hidden");
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      speakingIndicator.classList.add("hidden");
      stopSpeechBtn.classList.add("hidden");

      // Restart mic if it was active before speaking
      if (wasListening) {
        setTimeout(() => {
          startVoiceRecognition();
        }, config.micReactivationDelay);
      }
    };

    synth.speak(utterance);
  }

  function testVoiceSettings() {
    const testText =
      "This is a test of your current voice settings. You can adjust the voice type, rate and pitch to your preference.";
    speak(testText);
  }

  function addMessage(sender, text, returnId = false) {
    const messageId = Date.now();
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";
    messageDiv.id = `msg-${messageId}`;

    if (sender === "user") {
      messageDiv.innerHTML = `
                <div class="flex items-start space-x-2 justify-end">
                    <div class="max-w-[85%] bg-blue-500/20 rounded-xl p-3">
                        <p class="text-white">${text}</p>
                    </div>
                    <div class="bg-blue-500/20 rounded-full w-8 h-8 flex items-center justify-center">
                        <i class="fas fa-user text-blue-300"></i>
                    </div>
                </div>
            `;
    } else {
      messageDiv.innerHTML = `
                <div class="flex items-start space-x-2">
                    <div class="bg-blue-500/20 rounded-full w-8 h-8 flex items-center justify-center">
                        <i class="fas fa-robot text-blue-400"></i>
                    </div>
                    <div class="max-w-[85%]">
                        <p class="text-blue-400 font-medium">Jarvis:</p>
                        <div class="msg-content">${text}</div>
                    </div>
                </div>
            `;
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (returnId) {
      return messageId;
    }
  }

  function removeMessage(id) {
    const message = document.getElementById(`msg-${id}`);
    if (message) {
      message.remove();
    }
  }

  function openSettings() {
    settingsModal.classList.remove("opacity-0", "pointer-events-none");
    settingsModal.classList.add("opacity-100");
    setTimeout(() => {
      settingsModal.querySelector("div").classList.remove("scale-95");
      settingsModal.querySelector("div").classList.add("scale-100");
    }, 10);
  }

  function closeSettingsModal() {
    settingsModal.querySelector("div").classList.remove("scale-100");
    settingsModal.querySelector("div").classList.add("scale-95");
    setTimeout(() => {
      settingsModal.classList.remove("opacity-100");
      settingsModal.classList.add("opacity-0", "pointer-events-none");
    }, 300);
  }

  // Load voices when they become available
  synth.onvoiceschanged = function () {
    // This ensures we have voices loaded when we need them
  };
});
