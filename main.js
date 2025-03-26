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
  const languageSelect = document.getElementById("language-select");

  // App Configuration
  const config = {
    wakeWords: {
      en: "jarvis",
      hi: "जार्विस",
      fr: "jarvis",
      de: "jarvis",
      hu: "jarvis",
      es: "jarvis",
      ar: "جارفيس",
      zh: "贾维斯",
      ja: "ジャービス",
      ru: "джарвис",
      pt: "jarvis",
      it: "jarvis",
    },
    sleepCommands: {
      en: "go to sleep",
      hi: "सो जाओ",
      fr: "va dormir",
      de: "schlaf jetzt",
      hu: "aludj most",
      es: "vete a dormir",
      ar: "اذهب للنوم",
      zh: "去睡觉",
      ja: "眠りなさい",
      ru: "иди спать",
      pt: "vai dormir",
      it: "vai a dormire",
    },
    stopCommands: {
      en: "stop speaking",
      hi: "बोलना बंद करो",
      fr: "arrête de parler",
      de: "hör auf zu sprechen",
      hu: "ne beszélj",
      es: "deja de hablar",
      ar: "توقف عن الكلام",
      zh: "停止说话",
      ja: "話すのをやめて",
      ru: "перестань говорить",
      pt: "pare de falar",
      it: "smetti di parlare",
    },
    aiModel: "gemini-2.0-flash",
    defaultSearchEngine: "https://www.google.com/search?q=",
    defaultWebsitePrefix: "https://www.",
    defaultWebsiteSuffix: ".com",
    micReactivationDelay: 2000,
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
    language: "en",
  };

  // Current language commands
  let currentCommands = {
    wakeWord: config.wakeWords.en,
    sleepCommand: config.sleepCommands.en,
    stopCommand: config.stopCommands.en,
  };

  // Load saved settings from localStorage
  function loadSettings() {
    const savedSettings = localStorage.getItem("jarvisVoiceSettings");
    if (savedSettings) {
      voiceSettings = JSON.parse(savedSettings);
      voiceSelect.value = voiceSettings.voiceType;
      speechRate.value = voiceSettings.rate;
      speechPitch.value = voiceSettings.pitch;
      languageSelect.value = voiceSettings.language || "en";
      updateRateValue();
      updatePitchValue();
      updateLanguageCommands();
    }
  }

  // Update language-specific commands
  function updateLanguageCommands() {
    currentCommands.wakeWord =
      config.wakeWords[voiceSettings.language] || "jarvis";
    currentCommands.sleepCommand =
      config.sleepCommands[voiceSettings.language] || "go to sleep";
    currentCommands.stopCommand =
      config.stopCommands[voiceSettings.language] || "stop speaking";
  }

  // Save settings to localStorage
  function saveVoiceSettings() {
    voiceSettings = {
      voiceType: voiceSelect.value,
      rate: parseFloat(speechRate.value),
      pitch: parseFloat(speechPitch.value),
      language: languageSelect.value,
    };
    localStorage.setItem("jarvisVoiceSettings", JSON.stringify(voiceSettings));
    showToast(getLanguageResponse("settingsSaved"));
    updateLanguageCommands();

    if (isListening) {
      stopVoiceRecognition();
      setTimeout(() => {
        startVoiceRecognition();
      }, 500);
    }
  }

  // Update rate display value
  function updateRateValue() {
    const rate = parseFloat(speechRate.value);
    if (rate < 0.8) {
      rateValue.textContent = getLanguageResponse("slow");
    } else if (rate > 1.2) {
      rateValue.textContent = getLanguageResponse("fast");
    } else {
      rateValue.textContent = getLanguageResponse("normal");
    }
  }

  // Update pitch display value
  function updatePitchValue() {
    const pitch = parseFloat(speechPitch.value);
    if (pitch < 0.8) {
      pitchValue.textContent = getLanguageResponse("low");
    } else if (pitch > 1.2) {
      pitchValue.textContent = getLanguageResponse("high");
    } else {
      pitchValue.textContent = getLanguageResponse("normal");
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

  // Initialize speech recognition with proper language
  function initRecognition() {
    if (recognition) {
      recognition.stop();
    }

    recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;

    const langMap = {
      en: "en-US",
      hi: "hi-IN",
      fr: "fr-FR",
      de: "de-DE",
      hu: "hu-HU",
      es: "es-ES",
      ar: "ar-SA",
      zh: "zh-CN",
      ja: "ja-JP",
      ru: "ru-RU",
      pt: "pt-PT",
      it: "it-IT",
    };

    recognition.lang = langMap[voiceSettings.language] || "en-US";
  }

  // Start voice recognition
  function startVoiceRecognition() {
    if (isSpeaking) return;

    try {
      initRecognition();

      recognition.onstart = () => {
        isListening = true;
        micIcon.className = "fas fa-microphone-slash text-xl";
        listeningIndicator.classList.remove("hidden");
        micBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
        micBtn.classList.add("neon-btn-danger");
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
          setTimeout(() => {
            if (isListening) recognition.start();
          }, 500);
        } else {
          stopVoiceRecognition();
        }
      };

      recognition.onend = () => {
        if (isListening && !isSpeaking) {
          setTimeout(() => {
            if (isListening && !isSpeaking) recognition.start();
          }, 100);
        }
      };

      recognition.start();
    } catch (error) {
      console.error("Speech recognition not supported:", error);
      addMessage("assistant", getLanguageResponse("speechNotSupported"));
    }
  }

  // Stop voice recognition
  function stopVoiceRecognition() {
    if (recognition) recognition.stop();
    isListening = false;
    micIcon.className = "fas fa-microphone text-xl";
    listeningIndicator.classList.add("hidden");
    micBtn.classList.remove("neon-btn-danger");
    micBtn.classList.add("neon-btn");
    micBtn.classList.remove("animate-pulse");
  }

  // Process user command
  function processCommand(command) {
    const lowerCommand = command.toLowerCase();

    // Check for stop speaking command
    if (lowerCommand.includes(currentCommands.stopCommand)) {
      stopSpeaking();
      return;
    }

    // Check for wake word
    if (lowerCommand.includes(currentCommands.wakeWord)) {
      if (!isActive) {
        isActive = true;
        statusLight.className = "w-3 h-3 rounded-full bg-green-500";
        statusGlow.classList.add("opacity-100");
        setTimeout(() => {
          statusGlow.classList.remove("opacity-100");
        }, 1000);
        statusText.textContent = getLanguageResponse("activeStatus");
        const response = getLanguageResponse("wakeResponse");
        addMessage("assistant", response);
        speak(response);
      }
      return;
    }

    // Check for sleep command
    if (lowerCommand.includes(currentCommands.sleepCommand)) {
      if (isActive) {
        isActive = false;
        statusLight.className = "w-3 h-3 rounded-full bg-gray-500";
        statusText.textContent = getLanguageResponse("sleepingStatus");
        const response = getLanguageResponse("sleepResponse");
        addMessage("assistant", response);
        speak(response);
        if (isListening) stopVoiceRecognition();
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
        addMessage("assistant", getLanguageResponse("specifyWebsite"));
      }
      return;
    }

    // Process normal command if active
    if (isActive) {
      getAIResponse(command);
    } else {
      addMessage("assistant", getLanguageResponse("sleepingResponse"));
    }
  }

  // Extract website name from command
  function extractWebsiteName(command) {
    const cleanCommand = command.toLowerCase().replace("open", "").trim();
    const websiteName = cleanCommand.split(/\s+/)[0];

    if (websiteName === "google") return "google.com";
    if (websiteName === "facebook") return "facebook.com";
    if (websiteName === "twitter") return "twitter.com";
    if (websiteName === "instagram") return "instagram.com";

    return websiteName;
  }

  // Open YouTube song
  function openYoutubeSong(songName) {
    const encodedSong = encodeURIComponent(songName);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedSong}`;
    addMessage(
      "assistant",
      `${getLanguageResponse("searchingYoutube")}: ${songName}`
    );
    window.open(youtubeUrl, "_blank");
  }

  //////////////////////////////////////////
  //   // Website Opening Functionality
  //   async function openWebsite(websiteName) {
  //     const wasListening = isListening;
  //     if (wasListening) stopVoiceRecognition();

  //     websiteName = websiteName.toLowerCase().trim();

  //     // If it's a person's name (no dots, not a clear domain), search Google
  //     if (!websiteName.includes(".") && !isLikelyDomain(websiteName)) {
  //       const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
  //         websiteName
  //       )}`;
  //       openValidWebsite(searchUrl, websiteName, wasListening, true);
  //       return;
  //     }

  //     // Otherwise, proceed with domain detection
  //     websiteName = websiteName.replace(/^https?:\/\//, "");
  //     websiteName = websiteName.replace(/^www\./, "");
  //     websiteName = websiteName.replace(/\/$/, "");
  //     websiteName = websiteName.replace(/\.\/?$/, "");

  //     const tlds = ["com", "org", "net", "io", "co", "dev"];
  //     let websiteUrl;

  //     if (websiteName.includes(".")) {
  //       websiteUrl = `https://www.${websiteName}`;
  //       await tryOpenWebsite(websiteUrl, websiteName, wasListening);
  //       return;
  //     }

  //     for (const tld of tlds) {
  //       websiteUrl = `https://www.${websiteName}.${tld}`;
  //       const success = await tryOpenWebsite(
  //         websiteUrl,
  //         `${websiteName}.${tld}`,
  //         wasListening,
  //         false
  //       );
  //       if (success) return;
  //     }

  //     // If no TLD worked, fall back to a Google search
  //     const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
  //       websiteName
  //     )}`;
  //     openValidWebsite(searchUrl, websiteName, wasListening, true);
  //   }

  //   // Helper: Check if input resembles a domain (e.g., "google" vs "elon musk")
  //   function isLikelyDomain(input) {
  //     const commonDomains = [
  //       "google",
  //       "youtube",
  //       "facebook",
  //       "amazon",
  //       "wikipedia",
  //     ];
  //     return commonDomains.includes(input) || input.split(" ").length === 1;
  //   }

  //   // Helper: Try to open a URL (with fallback)
  //   async function tryOpenWebsite(
  //     url,
  //     displayName,
  //     wasListening,
  //     showMessage = true
  //   ) {
  //     try {
  //       await fetch(url, { method: "HEAD", mode: "no-cors" });
  //       openValidWebsite(url, displayName, wasListening, showMessage);
  //       return true;
  //     } catch (error) {
  //       return false;
  //     }
  //   }

  //   // Helper: Open a confirmed-valid URL
  //   function openValidWebsite(url, displayName, wasListening, showMessage) {
  //     if (showMessage) {
  //       addMessage(
  //         "assistant",
  //         `${getLanguageResponse("openingWebsite")} ${displayName}`
  //       );
  //     }

  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.target = "_blank";
  //     a.rel = "noopener noreferrer";
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);

  //     if (wasListening) {
  //       setTimeout(() => !isListening && startVoiceRecognition(), 1000);
  //     }
  //   }

  //   // Helper function to check if a website exists before opening
  //   async function tryOpenWebsite(
  //     url,
  //     displayName,
  //     wasListening,
  //     showMessage = true
  //   ) {
  //     try {
  //       // Test if the website loads (HEAD request)
  //       const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
  //       // If no error, open the website
  //       openValidWebsite(url, displayName, wasListening, showMessage);
  //       return true;
  //     } catch (error) {
  //       return false; // Website didn't load
  //     }
  //   }

  //   // Helper function to actually open the website
  //   function openValidWebsite(url, displayName, wasListening, showMessage) {
  //     if (showMessage) {
  //       addMessage(
  //         "assistant",
  //         `${getLanguageResponse("openingWebsite")} ${displayName}`
  //       );
  //     }

  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.target = "_blank";
  //     a.rel = "noopener noreferrer";
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);

  //     if (wasListening) {
  //       setTimeout(() => !isListening && startVoiceRecognition(), 1000);
  //     }
  //   }

  /////////////////////////////////////////////////////////////////////////////////////////////
  // Handle voice commands
  function handleCommand(command) {
    const lowerCmd = command.toLowerCase();

    if (lowerCmd.startsWith("open ")) {
      const website = command.substring(5).trim();
      openWebsite(website);
    } else if (lowerCmd.startsWith("search for ")) {
      const query = command.substring(11).trim();
      searchGoogle(query);
    }
  }

  // Only for opening websites
  async function openWebsite(websiteName) {
    const wasListening = isListening;
    if (wasListening) stopVoiceRecognition();

    websiteName = websiteName.toLowerCase().trim();
    const cleanName = cleanDomainName(websiteName);

    // Try direct URL if it contains a dot
    if (cleanName.includes(".")) {
      const websiteUrl = `https://www.${cleanName}`;
      if (await tryOpenWebsite(websiteUrl, cleanName, wasListening)) return;
    }

    // Try common TLDs
    const tlds = ["com", "org", "net", "io", "co", "dev"];
    for (const tld of tlds) {
      const websiteUrl = `https://www.${cleanName}.${tld}`;
      if (
        await tryOpenWebsite(
          websiteUrl,
          `${cleanName}.${tld}`,
          wasListening,
          false
        )
      )
        return;
    }

    // If no valid website found
    addMessage(
      "assistant",
      `${getLanguageResponse("websiteNotFound")} ${websiteName}`
    );
    if (wasListening) setTimeout(() => startVoiceRecognition(), 1000);
  }

  // Only for Google searches
  function searchGoogle(query) {
    const wasListening = isListening;
    if (wasListening) stopVoiceRecognition();

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}`;
    openValidWebsite(searchUrl, query, wasListening, true);
  }

  // Helper functions
  function cleanDomainName(name) {
    return name
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .replace(/\.\/?$/, "");
  }

  async function tryOpenWebsite(
    url,
    displayName,
    wasListening,
    showMessage = true
  ) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      openValidWebsite(url, displayName, wasListening, showMessage);
      return true;
    } catch (error) {
      return false;
    }
  }

  function openValidWebsite(
    url,
    displayName,
    wasListening,
    showMessage = true
  ) {
    if (showMessage) {
      addMessage(
        "assistant",
        `${getLanguageResponse("opening")} ${displayName}`
      );
    }

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (wasListening) {
      setTimeout(() => !isListening && startVoiceRecognition(), 1000);
    }
  }

  async function getAIResponse(query) {
    try {
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

      removeMessage(thinkingId);

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
      addMessage("assistant", getLanguageResponse("aiError"));
    }
  }

  // Format AI response
  function formatAIResponse(text) {
    let formatted = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/#/g, "")
      .replace(/---/g, "")
      .replace(/_{2,}/g, "")
      .replace(/^(.*?)\n[-=]{2,}\n/gm, '<h2 class="neon-header">$1</h2>')
      .replace(/^\s*[-•*]\s+(.*$)/gm, '<li class="glow-item">$1</li>')
      .replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="numbered-item">$1</li>')
      .replace(/^>\s*(.*$)/gm, '<blockquote class="neon-quote">$1</blockquote>')
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="code-block"><code>$1</code></pre>'
      )
      .replace(/\n/g, "<br>");

    formatted = formatted.replace(
      /(<li class="glow-item">.*?<\/li>(<br>)?)+/g,
      '<ul class="glow-list">$&</ul>'
    );
    formatted = formatted.replace(
      /(<li class="numbered-item">.*?<\/li>(<br>)?)+/g,
      '<ol class="numbered-list">$&</ol>'
    );

    formatted = formatted
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" class="neon-link" target="_blank">$1 <i class="fas fa-external-link-alt"></i></a>'
      )
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" class="neon-link" target="_blank">$1 <i class="fas fa-external-link-alt"></i></a>'
      );

    formatted = formatted.replace(
      /<br><br>/g,
      '</p><div class="divider"><div class="divider-line"></div></div><p>'
    );

    return `<div class="ai-message-content">${formatted}</div>`;
  }

  // Stop speaking
  function stopSpeaking() {
    if (synth.speaking) {
      synth.cancel();
      isSpeaking = false;
      speakingIndicator.classList.add("hidden");
      stopSpeechBtn.classList.add("hidden");
      addMessage("assistant", getLanguageResponse("speechStopped"));

      if (isListening) {
        setTimeout(() => {
          startVoiceRecognition();
        }, config.micReactivationDelay);
      }
    }
  }

  // Speak text
  function speak(text) {
    if (synth.speaking) synth.cancel();

    const wasListening = isListening;
    if (wasListening) stopVoiceRecognition();

    isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;

    const voices = synth.getVoices();
    let selectedVoice = null;

    if (voices.length > 0) {
      if (voiceSettings.voiceType === "male") {
        selectedVoice = voices.find(
          (v) =>
            v.name.includes("Male") ||
            v.name.includes("male") ||
            v.name.includes("David") ||
            v.name.includes("Alex")
        );
      } else if (voiceSettings.voiceType === "female") {
        selectedVoice = voices.find(
          (v) =>
            v.name.includes("Female") ||
            v.name.includes("female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Zira") ||
            v.name.includes("Karen")
        );
      }

      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.default) || voices[0];
      }

      // Try to find a voice matching the current language
      const langCode = voiceSettings.language;
      const langVoices = voices.filter((v) => v.lang.startsWith(langCode));
      if (langVoices.length > 0) {
        // Prefer the selected voice type in the current language
        const matchingVoice = langVoices.find(
          (v) =>
            (voiceSettings.voiceType === "male" &&
              v.name.toLowerCase().includes("male")) ||
            (voiceSettings.voiceType === "female" &&
              v.name.toLowerCase().includes("female")) ||
            voiceSettings.voiceType === "default"
        );
        if (matchingVoice) {
          selectedVoice = matchingVoice;
        } else {
          selectedVoice = langVoices[0];
        }
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

      if (wasListening) {
        setTimeout(() => {
          startVoiceRecognition();
        }, config.micReactivationDelay);
      }
    };

    synth.speak(utterance);
  }

  // Test voice settings
  function testVoiceSettings() {
    const testTexts = {
      en: "This is a test of your current voice settings. You can adjust the voice type, rate and pitch to your preference.",
      hi: "यह आपकी वर्तमान आवाज सेटिंग्स का परीक्षण है। आप आवाज प्रकार, गति और पिच को अपनी पसंद के अनुसार समायोजित कर सकते हैं।",
      fr: "Ceci est un test de vos paramètres vocaux actuels. Vous pouvez ajuster le type de voix, la vitesse et la hauteur selon vos préférences.",
      de: "Dies ist ein Test Ihrer aktuellen Stimmeinstellungen. Sie können den Stimmentyp, die Geschwindigkeit und die Tonhöhe nach Ihren Wünschen anpassen.",
      hu: "Ez az aktuális hangbeállítások tesztelése. A hang típusát, sebességét és magasságát saját preferenciái szerint állíthatja be.",
      es: "Esta es una prueba de la configuración actual de su voz. Puede ajustar el tipo de voz, la velocidad y el tono según sus preferencias.",
      ar: "هذا اختبار لإعدادات الصوت الحالية الخاصة بك. يمكنك ضبط نوع الصوت والمعدل والدرجة حسب تفضيلاتك.",
      zh: "这是对您当前语音设置的测试。您可以根据自己的喜好调整语音类型、语速和音高。",
      ja: "これは現在の音声設定のテストです。音声の種類、速度、高さをお好みに合わせて調整できます。",
      ru: "Это тест ваших текущих голосовых настроек. Вы можете настроить тип голоса, скорость и высоту тона по своему усмотрению.",
      pt: "Este é um teste das configurações de voz atuais. Você pode ajustar o tipo de voz, velocidade e tom de acordo com sua preferência.",
      it: "Questo è un test delle impostazioni vocali correnti. Puoi regolare il tipo di voce, la velocità e l'altezza in base alle tue preferenze.",
    };

    const testText = testTexts[voiceSettings.language] || testTexts.en;
    speak(testText);
  }

  // Add message to chat
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

    if (returnId) return messageId;
  }

  // Remove message from chat
  function removeMessage(id) {
    const message = document.getElementById(`msg-${id}`);
    if (message) message.remove();
  }

  // Open settings modal
  function openSettings() {
    settingsModal.classList.remove("opacity-0", "pointer-events-none");
    settingsModal.classList.add("opacity-100");
    setTimeout(() => {
      settingsModal.querySelector("div").classList.remove("scale-95");
      settingsModal.querySelector("div").classList.add("scale-100");
    }, 10);
  }

  // Close settings modal
  function closeSettingsModal() {
    settingsModal.querySelector("div").classList.remove("scale-100");
    settingsModal.querySelector("div").classList.add("scale-95");
    setTimeout(() => {
      settingsModal.classList.remove("opacity-100");
      settingsModal.classList.add("opacity-0", "pointer-events-none");
    }, 300);
  }

  // Get language-specific response
  function getLanguageResponse(type) {
    const responses = {
      wakeResponse: {
        en: "Yes, I'm listening. How can I help you?",
        hi: "हाँ, मैं सुन रहा हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
        fr: "Oui, je vous écoute. Comment puis-je vous aider?",
        de: "Ja, ich höre zu. Wie kann ich Ihnen helfen?",
        hu: "Igen, hallom. Hogyan segíthetek?",
        es: "Sí, estoy escuchando. ¿Cómo puedo ayudarte?",
        ar: "نعم، أنا أستمع. كيف يمكنني مساعدتك؟",
        zh: "是的，我在听。我该如何帮助你？",
        ja: "はい、聞いています。どうすればお手伝いできますか？",
        ru: "Да, я слушаю. Как я могу вам помочь?",
        pt: "Sim, estou ouvindo. Como posso te ajudar?",
        it: "Sì, ti sto ascoltando. Come posso aiutarti?",
      },
      sleepResponse: {
        en: `Going to sleep. Say "${currentCommands.wakeWord}" to wake me up again.`,
        hi: `सो रहा हूँ। मुझे फिर से जगाने के लिए "${currentCommands.wakeWord}" कहें।`,
        fr: `Je m'endors. Dites "${currentCommands.wakeWord}" pour me réveiller.`,
        de: `Ich gehe schlafen. Sage "${currentCommands.wakeWord}" um mich wieder zu wecken.`,
        hu: `Elmegyek aludni. Mondja "${currentCommands.wakeWord}" hogy felébresszen.`,
        es: `Me voy a dormir. Di "${currentCommands.wakeWord}" para despertarme.`,
        ar: `أنا ذاهب للنوم. قل "${currentCommands.wakeWord}" لإيقاظي مرة أخرى.`,
        zh: `我要睡觉了。说"${currentCommands.wakeWord}"可以再次唤醒我。`,
        ja: `眠ります。"${currentCommands.wakeWord}"と言ってまた起こしてください。`,
        ru: `Я иду спать. Скажите "${currentCommands.wakeWord}" чтобы разбудить меня.`,
        pt: `Indo dormir. Diga "${currentCommands.wakeWord}" para me acordar novamente.`,
        it: `Sto andando a dormire. Di "${currentCommands.wakeWord}" per svegliarmi.`,
      },
      sleepingResponse: {
        en: `I'm currently sleeping. Say "${currentCommands.wakeWord}" to wake me up.`,
        hi: `मैं अभी सो रहा हूँ। मुझे जगाने के लिए "${currentCommands.wakeWord}" कहें।`,
        fr: `Je suis actuellement en sommeil. Dites "${currentCommands.wakeWord}" pour me réveiller.`,
        de: `Ich schlafe gerade. Sage "${currentCommands.wakeWord}" um mich zu wecken.`,
        hu: `Jelenleg alszom. Mondja "${currentCommands.wakeWord}" hogy felébresszen.`,
        es: `Actualmente estoy durmiendo. Di "${currentCommands.wakeWord}" para despertarme.`,
        ar: `أنا نائم حاليا. قل "${currentCommands.wakeWord}" لإيقاظي.`,
        zh: `我正在睡觉。说"${currentCommands.wakeWord}"可以唤醒我。`,
        ja: `現在眠っています。"${currentCommands.wakeWord}"と言って起こしてください。`,
        ru: `Я сейчас сплю. Скажите "${currentCommands.wakeWord}" чтобы разбудить меня.`,
        pt: `Atualmente estou dormindo. Diga "${currentCommands.wakeWord}" para me acordar.`,
        it: `Attualmente sto dormendo. Di "${currentCommands.wakeWord}" per svegliarmi.`,
      },
      speechStopped: {
        en: "Speech stopped.",
        hi: "बोलना बंद कर दिया।",
        fr: "Discours arrêté.",
        de: "Sprache gestoppt.",
        hu: "Beszéd leállítva.",
        es: "Discurso detenido.",
        ar: "توقف الكلام.",
        zh: "语音已停止。",
        ja: "音声を停止しました。",
        ru: "Речь остановлена.",
        pt: "Fala parada.",
        it: "Discorso fermato.",
      },
      specifyWebsite: {
        en: "Please specify a website name to open.",
        hi: "कृपया खोलने के लिए एक वेबसाइट नाम निर्दिष्ट करें।",
        fr: "Veuillez spécifier un nom de site Web à ouvrir.",
        de: "Bitte geben Sie einen Website-Namen zum Öffnen an.",
        hu: "Kérjük, adjon meg egy webhelynevet a megnyitáshoz.",
        es: "Por favor especifique un nombre de sitio web para abrir.",
        ar: "يرجى تحديد اسم موقع لفتحه.",
        zh: "请指定要打开的网站名称。",
        ja: "開くウェブサイト名を指定してください。",
        ru: "Пожалуйста, укажите название сайта для открытия.",
        pt: "Por favor, especifique um nome de site para abrir.",
        it: "Si prega di specificare un nome di sito web da aprire.",
      },
      searchingYoutube: {
        en: "Searching YouTube for",
        hi: "यूट्यूब पर खोज रहा है",
        fr: "Recherche sur YouTube pour",
        de: "Suche auf YouTube nach",
        hu: "Keresés a YouTube-on",
        es: "Buscando en YouTube",
        ar: "البحث على يوتيوب عن",
        zh: "正在YouTube上搜索",
        ja: "YouTubeで検索中",
        ru: "Поиск на YouTube",
        pt: "Pesquisando no YouTube por",
        it: "Cercando su YouTube",
      },
      openingWebsite: {
        en: "Opening",
        hi: "खोल रहा है",
        fr: "Ouverture de",
        de: "Öffne",
        hu: "Megnyitás",
        es: "Abriendo",
        ar: "فتح",
        zh: "正在打开",
        ja: "開いています",
        ru: "Открытие",
        pt: "Abrindo",
        it: "Apertura di",
      },
      settingsSaved: {
        en: "Settings saved successfully",
        hi: "सेटिंग्स सफलतापूर्वक सहेजी गईं",
        fr: "Paramètres enregistrés avec succès",
        de: "Einstellungen erfolgreich gespeichert",
        hu: "Beállítások sikeresen mentve",
        es: "Configuración guardada correctamente",
        ar: "تم حفظ الإعدادات بنجاح",
        zh: "设置已成功保存",
        ja: "設定が正常に保存されました",
        ru: "Настройки успешно сохранены",
        pt: "Configurações salvas com sucesso",
        it: "Impostazioni salvate con successo",
      },
      speechNotSupported: {
        en: "Speech recognition is not supported in your browser.",
        hi: "आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।",
        fr: "La reconnaissance vocale n'est pas prise en charge dans votre navigateur.",
        de: "Spracherkennung wird in Ihrem Browser nicht unterstützt.",
        hu: "A beszédfelismerés nem támogatott a böngészőjében.",
        es: "El reconocimiento de voz no es compatible en su navegador.",
        ar: "التعرف على الكلام غير مدعوم في متصفحك.",
        zh: "您的浏览器不支持语音识别。",
        ja: "お使いのブラウザでは音声認識がサポートされていません。",
        ru: "Распознавание речи не поддерживается в вашем браузере.",
        pt: "O reconhecimento de fala não é suportado no seu navegador.",
        it: "Il riconoscimento vocale non è supportato nel tuo browser.",
      },
      aiError: {
        en: "Sorry, I encountered an error processing your request.",
        hi: "क्षमा करें, मैंने आपके अनुरोध को संसाधित करते समय एक त्रुटि का सामना किया।",
        fr: "Désolé, j'ai rencontré une erreur lors du traitement de votre demande.",
        de: "Entschuldigung, bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten.",
        hu: "Sajnálom, hiba történt a kérés feldolgozása során.",
        es: "Lo siento, encontré un error al procesar tu solicitud.",
        ar: "عذرا، واجهت خطأ أثناء معالجة طلبك.",
        zh: "抱歉，处理您的请求时遇到错误。",
        ja: "申し訳ありませんが、リクエストの処理中にエラーが発生しました。",
        ru: "Извините, я столкнулся с ошибкой при обработке вашего запроса.",
        pt: "Desculpe, encontrei um erro ao processar sua solicitação.",
        it: "Spiacente, ho riscontrato un errore durante l'elaborazione della tua richiesta.",
      },
      activeStatus: {
        en: "Active",
        hi: "सक्रिय",
        fr: "Actif",
        de: "Aktiv",
        hu: "Aktív",
        es: "Activo",
        ar: "نشط",
        zh: "活跃",
        ja: "アクティブ",
        ru: "Активный",
        pt: "Ativo",
        it: "Attivo",
      },
      sleepingStatus: {
        en: "Sleeping",
        hi: "सो रहा है",
        fr: "Dormir",
        de: "Schlafen",
        hu: "Alszik",
        es: "Durmiendo",
        ar: "نائم",
        zh: "睡眠中",
        ja: "スリープ中",
        ru: "Спящий",
        pt: "Dormindo",
        it: "Dormiente",
      },
      slow: {
        en: "Slow",
        hi: "धीमा",
        fr: "Lent",
        de: "Langsam",
        hu: "Lassú",
        es: "Lento",
        ar: "بطيء",
        zh: "慢",
        ja: "遅い",
        ru: "Медленно",
        pt: "Lento",
        it: "Lento",
      },
      fast: {
        en: "Fast",
        hi: "तेज़",
        fr: "Rapide",
        de: "Schnell",
        hu: "Gyors",
        es: "Rápido",
        ar: "سريع",
        zh: "快",
        ja: "速い",
        ru: "Быстро",
        pt: "Rápido",
        it: "Veloce",
      },
      normal: {
        en: "Normal",
        hi: "सामान्य",
        fr: "Normal",
        de: "Normal",
        hu: "Normál",
        es: "Normal",
        ar: "عادي",
        zh: "正常",
        ja: "通常",
        ru: "Нормальный",
        pt: "Normal",
        it: "Normale",
      },
      low: {
        en: "Low",
        hi: "कम",
        fr: "Bas",
        de: "Niedrig",
        hu: "Alacsony",
        es: "Bajo",
        ar: "منخفض",
        zh: "低",
        ja: "低い",
        ru: "Низкий",
        pt: "Baixo",
        it: "Basso",
      },
      high: {
        en: "High",
        hi: "उच्च",
        fr: "Haut",
        de: "Hoch",
        hu: "Magas",
        es: "Alto",
        ar: "عالي",
        zh: "高",
        ja: "高い",
        ru: "Высокий",
        pt: "Alto",
        it: "Alto",
      },
    };

    return responses[type][voiceSettings.language] || responses[type].en;
  }

  // Initialize event listeners
  micBtn.addEventListener("click", toggleVoiceRecognition);
  stopSpeechBtn.addEventListener("click", stopSpeaking);
  settingsBtn.addEventListener("click", openSettings);
  closeSettings.addEventListener("click", closeSettingsModal);
  saveSettings.addEventListener("click", saveVoiceSettings);
  testVoice.addEventListener("click", testVoiceSettings);
  speechRate.addEventListener("input", updateRateValue);
  speechPitch.addEventListener("input", updatePitchValue);
  languageSelect.addEventListener("change", () => {
    voiceSettings.language = languageSelect.value;
    updateLanguageCommands();
  });

  // Load settings when page loads
  loadSettings();

  // Handle page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isListening) {
      setTimeout(() => {
        stopVoiceRecognition();
        startVoiceRecognition();
      }, 500);
    }
  });

  // Toggle voice recognition
  function toggleVoiceRecognition() {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }

  // Load voices when they become available
  synth.onvoiceschanged = function () {
    // This ensures we have voices loaded when we need them
  };
});

// store message
