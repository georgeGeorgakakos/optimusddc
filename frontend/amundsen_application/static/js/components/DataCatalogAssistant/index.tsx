// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// VERSION: FULL-FEATURES-9-ENHANCEMENTS

import * as React from 'react';
import './styles.scss';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TalkingHeadInstance {
  showAvatar: (options: any) => Promise<void>;
  speakText: (text: string, options?: any) => Promise<void>;
  stopSpeaking: () => void;
  setMood?: (mood: string) => void;
  scene?: any;
}

interface AvatarConfig {
  id: string;
  name: string;
  url: string;
  body: 'M' | 'F';
  description: string;
}

// ==================== FEATURE: SUGGESTED QUESTIONS ====================
const SUGGESTED_QUESTIONS = [
  'What tables are available?',
  'Show me solar energy data',
  'Who owns the wind_turbine table?',
  'What are the most popular tags?',
  'Find renewable energy datasets',
  'Show table schema for power_output',
];

// ==================== FEATURE: SOUND EFFECTS ====================
const playSound = (type: 'send' | 'receive' | 'error' | 'click') => {
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case 'send':
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      break;
    case 'receive':
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      break;
    case 'error':
      oscillator.frequency.value = 300;
      oscillator.type = 'square';
      gainNode.gain.value = 0.1;
      break;
    case 'click':
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.05;
      break;
  }

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.1
  );
  oscillator.stop(audioContext.currentTime + 0.1);
};

// ==================== FEATURE: TIME-BASED GREETING ====================
const getGreeting = (name: string = 'there'): string => {
  const hour = new Date().getHours();
  let timeGreeting: string;

  if (hour < 12) {
    timeGreeting = 'Good morning';
  } else if (hour < 17) {
    timeGreeting = 'Good afternoon';
  } else {
    timeGreeting = 'Good evening';
  }

  return `${timeGreeting}, ${name}!`;
};

const DataCatalogAssistant: React.FC = () => {
  // State
  const [isOpen, setIsOpen] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [avatarReady, setAvatarReady] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string>('');
  const [loadingStatus, setLoadingStatus] = React.useState<string>('Ready');
  const [subtitles, setSubtitles] = React.useState<string>('');
  const [interimTranscript, setInterimTranscript] = React.useState<string>('');
  const [selectedAvatarId, setSelectedAvatarId] =
    React.useState<string>('linda_swarm');

  // FEATURE: Mute Memory (localStorage)
  const [isMuted, setIsMuted] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('optimusdb_muted');

    return saved ? JSON.parse(saved) : false;
  });

  // FEATURE: Voice Speed Slider
  const [voiceSpeed, setVoiceSpeed] = React.useState<number>(() => {
    const saved = localStorage.getItem('optimusdb_voice_speed');

    return saved ? parseFloat(saved) : 0.85;
  });

  // FEATURE: Timestamps Toggle
  const [showTimestamps, setShowTimestamps] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('optimusdb_show_timestamps');

    return saved ? JSON.parse(saved) : true;
  });

  // FEATURE: Sound Effects Toggle
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('optimusdb_sound_enabled');

    return saved ? JSON.parse(saved) : true;
  });

  // FEATURE: Character Counter
  const MAX_CHARS = 500;

  // Refs
  const avatarContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const headRef = React.useRef<TalkingHeadInstance | null>(null);
  const speechSynthRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const visemeAnimationRef = React.useRef<number | null>(null);

  // Configuration
  const BACKEND_URL =
    process.env.REACT_APP_OPTIMUSDB_URL || '/api/v1/chat';

  const AVATARS: AvatarConfig[] = React.useMemo(
    () => [
      {
        id: 'linda_swarm',
        name: 'Linda Swarm',
        url:
          process.env.REACT_APP_AVATAR_LINDA_URL ||
          'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024',
        body: 'F',
        description: 'Assistant - Friendly Guide',
      },
      {
        id: 'gg_swarm',
        name: 'GG Swarm',
        url:
          process.env.REACT_APP_AVATAR_GG_URL ||
          'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024',
        body: 'F',
        description: 'Scientist - Data Expert',
      },
    ],
    []
  );

  const currentAvatar = React.useMemo(
    () => AVATARS.find((a) => a.id === selectedAvatarId) || AVATARS[0],
    [AVATARS, selectedAvatarId]
  );

  const AVATAR_BACKGROUND =
    process.env.REACT_APP_AVATAR_BACKGROUND ||
    'https://www.swarmchestrate.eu/wp-content/uploads/2024/03/cyber-security-17.png';

  const VOICE_ENABLED = process.env.REACT_APP_ENABLE_VOICE_OUTPUT !== 'false';
  const VOICE_HOTKEY = 'ctrl+shift+v';

  // FEATURE: Save preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem('optimusdb_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  React.useEffect(() => {
    localStorage.setItem('optimusdb_voice_speed', voiceSpeed.toString());
  }, [voiceSpeed]);

  React.useEffect(() => {
    localStorage.setItem(
      'optimusdb_show_timestamps',
      JSON.stringify(showTimestamps)
    );
  }, [showTimestamps]);

  React.useEffect(() => {
    localStorage.setItem(
      'optimusdb_sound_enabled',
      JSON.stringify(soundEnabled)
    );
  }, [soundEnabled]);

  React.useEffect(() => {
    (window as any).headRef = headRef;
    (window as any).debugAssistant = {
      isMuted,
      avatarReady,
      VOICE_ENABLED,
      headRef: headRef.current,
      selectedAvatar: currentAvatar.name,
      voiceSpeed,
      version: 'FULL-FEATURES-9-ENHANCEMENTS',
    };
  }, [isMuted, avatarReady, currentAvatar.name, voiceSpeed]);

  // ==================== OCULUS VISEME MAPPING ====================

  const OCULUS_VISEME_TO_ARKIT: { [key: number]: { [key: string]: number } } = {
    0: {},
    1: { mouthClose: 1.0, mouthPucker: 0.3 },
    2: {
      mouthLowerDownLeft: 0.7,
      mouthLowerDownRight: 0.7,
      mouthUpperUpLeft: 0.4,
      mouthUpperUpRight: 0.4,
    },
    3: { jawOpen: 0.3, mouthLowerDownLeft: 0.5, mouthLowerDownRight: 0.5 },
    4: { jawOpen: 0.3, mouthOpen: 0.2 },
    5: { jawOpen: 0.4, mouthOpen: 0.3 },
    6: { mouthFunnel: 0.4, jawOpen: 0.3 },
    7: { mouthSmileLeft: 0.6, mouthSmileRight: 0.6, jawOpen: 0.2 },
    8: { jawOpen: 0.2, mouthClose: 0.3 },
    9: { mouthRollLower: 0.6, jawOpen: 0.3 },
    10: { jawOpen: 0.9, mouthOpen: 0.7 },
    11: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, jawOpen: 0.4 },
    12: { mouthSmileLeft: 0.6, mouthSmileRight: 0.6, jawOpen: 0.5 },
    13: { mouthPucker: 0.8, mouthFunnel: 0.6, jawOpen: 0.6 },
    14: { mouthPucker: 1.0, mouthFunnel: 0.8, jawOpen: 0.3 },
  };

  const PHONEME_TO_OCULUS: { [key: string]: number } = {
    SIL: 0,
    P: 1,
    B: 1,
    M: 1,
    F: 2,
    V: 2,
    TH: 3,
    T: 4,
    D: 4,
    N: 8,
    L: 4,
    S: 7,
    Z: 7,
    CH: 6,
    J: 6,
    SH: 6,
    ZH: 6,
    Y: 11,
    K: 5,
    G: 5,
    NG: 8,
    H: 10,
    R: 9,
    W: 14,
    AA: 10,
    AE: 10,
    AH: 10,
    AO: 13,
    AW: 10,
    AY: 11,
    EH: 11,
    ER: 9,
    EY: 11,
    IH: 12,
    IY: 11,
    OW: 13,
    OY: 13,
    UH: 14,
    UW: 14,
  };

  const textToPhonemes = (text: string): string[] => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/);
    const phonemes: string[] = [];

    words.forEach((word) => {
      if (word.length === 0) {
        phonemes.push('SIL');

        return;
      }
      let i = 0;

      while (i < word.length) {
        const twoChar = word.substring(i, i + 2);
        const threeChar = word.substring(i, i + 3);

        if (threeChar === 'tch') {
          phonemes.push('CH');
          i += 3;
        } else if (threeChar === 'thr') {
          phonemes.push('TH', 'R');
          i += 3;
        } else if (twoChar === 'th') {
          phonemes.push('TH');
          i += 2;
        } else if (twoChar === 'ch') {
          phonemes.push('CH');
          i += 2;
        } else if (twoChar === 'sh') {
          phonemes.push('SH');
          i += 2;
        } else if (twoChar === 'ng') {
          phonemes.push('NG');
          i += 2;
        } else if (twoChar === 'oo') {
          phonemes.push('UW');
          i += 2;
        } else if (twoChar === 'ee' || twoChar === 'ea') {
          phonemes.push('IY');
          i += 2;
        } else if (twoChar === 'ai' || twoChar === 'ay') {
          phonemes.push('EY');
          i += 2;
        } else if (twoChar === 'ow') {
          phonemes.push('OW');
          i += 2;
        } else if (twoChar === 'ou') {
          phonemes.push('AW');
          i += 2;
        } else {
          const char = word[i];
          const map: { [key: string]: string } = {
            a: 'AE',
            e: 'EH',
            i: 'IH',
            o: 'AO',
            u: 'AH',
            b: 'B',
            c: 'K',
            d: 'D',
            f: 'F',
            g: 'G',
            h: 'H',
            j: 'J',
            k: 'K',
            l: 'L',
            m: 'M',
            n: 'N',
            p: 'P',
            q: 'K',
            r: 'R',
            s: 'S',
            t: 'T',
            v: 'V',
            w: 'W',
            y: 'Y',
            z: 'Z',
          };

          if (char === 'x') {
            phonemes.push('K', 'S');
          } else {
            phonemes.push(map[char] || 'SIL');
          }
          i++;
        }
      }
      phonemes.push('SIL');
    });

    return phonemes;
  };

  const applyVisemeToAvatar = React.useCallback(
    (visemeIndex: number, intensity: number = 1.0) => {
      if (!headRef.current?.scene) return;
      headRef.current.scene.traverse((node: any) => {
        if (node.morphTargetDictionary && node.morphTargetInfluences) {
          const targetMorphs = OCULUS_VISEME_TO_ARKIT[visemeIndex] || {};

          for (let i = 0; i < node.morphTargetInfluences.length; i++) {
            node.morphTargetInfluences[i] *= 0.7;
          }
          Object.entries(targetMorphs).forEach(([morphName, targetValue]) => {
            const morphIndex = node.morphTargetDictionary[morphName];

            if (morphIndex !== undefined) {
              const currentValue = node.morphTargetInfluences[morphIndex] || 0;

              node.morphTargetInfluences[morphIndex] =
                currentValue * 0.3 + targetValue * intensity * 0.7;
            }
          });
        }
      });
    },
    []
  );

  const resetMorphs = React.useCallback(() => {
    if (!headRef.current?.scene) return;
    headRef.current.scene.traverse((node: any) => {
      if (node.morphTargetInfluences) {
        for (let i = 0; i < node.morphTargetInfluences.length; i++) {
          node.morphTargetInfluences[i] *= 0.9;
        }
      }
    });
  }, []);

  const animatePhonemes = React.useCallback(
    (phonemes: string[], speechRate: number = 1.0) => {
      const baseDuration = 80;
      const duration = baseDuration / speechRate;
      let currentTime = 0;

      phonemes.forEach((phoneme) => {
        setTimeout(() => {
          const oculusViseme = PHONEME_TO_OCULUS[phoneme] || 0;
          const intensity = phoneme === 'SIL' ? 0 : 1.0;

          applyVisemeToAvatar(oculusViseme, intensity);
        }, currentTime);
        currentTime += duration;
      });
      setTimeout(() => resetMorphs(), currentTime + 500);
    },
    [applyVisemeToAvatar, resetMorphs]
  );

  // ==================== SPEECH ====================

  const getBrowserVoice = React.useCallback(() => {
    const voices = window.speechSynthesis.getVoices();

    if (voices.length === 0) return null;
    const preferredVoices = [
      'Microsoft David Desktop - English (United States)',
      'Microsoft Zira Desktop - English (United States)',
      'Google US English',
      'Microsoft Mark - English (United States)',
      'English United States',
      'en-US',
    ];

    for (const preferred of preferredVoices) {
      const voice = voices.find(
        (v) =>
          v.name === preferred ||
          v.name.includes(preferred) ||
          v.lang === preferred
      );

      if (voice) {
        console.log('✅ Selected voice:', voice.name);

        return voice;
      }
    }
    const englishVoices = voices.filter(
      (v) => v.lang.startsWith('en') && v.localService
    );

    if (englishVoices.length > 0) return englishVoices[0];

    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }, []);

  // Enhanced text cleaning - removes emojis
  const cleanTextForSpeech = (text: string): string => {
    let cleaned = text;

    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
    cleaned = cleaned.replace(/\*\*/g, '');
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/#{1,6}\s/g, '');
    cleaned = cleaned.replace(/`/g, '');
    cleaned = cleaned.replace(/\[.*?\]\(.*?\)/g, '');
    cleaned = cleaned.replace(/\n+/g, '. ');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\.+/g, '.');
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/^[.,;:!?]+/, '');
    cleaned = cleaned.replace(/[.,;:!?]+$/, '');

    return cleaned;
  };

  const speakWithLipsync = React.useCallback(
    async (text: string) => {
      const cleanText = cleanTextForSpeech(text);

      if (!cleanText || cleanText.length < 2) {
        console.log('⏭️ Skipping speech - text empty after cleaning');

        return;
      }
      console.log(
        '🔊 Speaking with natural voice + lip-sync (rate:',
        voiceSpeed,
        ')'
      );
      setIsSpeaking(true);
      setSubtitles('');

      try {
        const phonemes = textToPhonemes(cleanText);
        const loadVoices = () =>
          new Promise<void>((resolve) => {
            const voices = window.speechSynthesis.getVoices();

            if (voices.length > 0) {
              resolve();
            } else {
              window.speechSynthesis.onvoiceschanged = () => resolve();
              setTimeout(() => resolve(), 5000);
            }
          });

        await loadVoices();
        const voice = getBrowserVoice();
        const utterance = new SpeechSynthesisUtterance(cleanText);

        utterance.voice = voice;
        utterance.rate = voiceSpeed; // FEATURE: Use voice speed slider value
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        speechSynthRef.current = utterance;
        animatePhonemes(phonemes, utterance.rate);

        const words = cleanText.split(' ');
        let wordIndex = 0;
        const wordDuration =
          (cleanText.length / words.length) * (80 / voiceSpeed);
        const subtitleInterval = setInterval(() => {
          if (wordIndex < words.length) {
            setSubtitles(words[wordIndex]);
            wordIndex++;
          } else {
            clearInterval(subtitleInterval);
          }
        }, wordDuration);

        utterance.onend = () => {
          clearInterval(subtitleInterval);
          setIsSpeaking(false);
          setSubtitles('');
          resetMorphs();
        };
        utterance.onerror = (error) => {
          console.error('❌ Speech error:', error);
          clearInterval(subtitleInterval);
          setIsSpeaking(false);
          setSubtitles('');
          resetMorphs();
        };
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('❌ Lipsync error:', error);
        setIsSpeaking(false);
        setSubtitles('');
        resetMorphs();
      }
    },
    [animatePhonemes, resetMorphs, getBrowserVoice, voiceSpeed]
  );

  const speak = React.useCallback(
    async (text: string) => {
      if (isMuted || !VOICE_ENABLED) return;
      await speakWithLipsync(text);
    },
    [isMuted, VOICE_ENABLED, speakWithLipsync]
  );

  const stopSpeaking = React.useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (visemeAnimationRef.current) {
      cancelAnimationFrame(visemeAnimationRef.current);
    }
    resetMorphs();
    setIsSpeaking(false);
    setSubtitles('');
  }, [resetMorphs]);

  // ==================== AVATAR ====================

  const initializeAvatar = React.useCallback(async () => {
    if (!avatarContainerRef.current || headRef.current || avatarReady) return;
    console.log('🎭 Loading avatar:', currentAvatar.name);
    setLoadingStatus(`Loading ${currentAvatar.name}...`);
    setAvatarError('');

    try {
      const importPromise = import('@met4citizen/talkinghead');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Library timeout')), 10000)
      );
      const TalkingHeadModule = (await Promise.race([
        importPromise,
        timeoutPromise,
      ])) as any;
      const TalkingHead =
        TalkingHeadModule.default ||
        TalkingHeadModule.TalkingHead ||
        TalkingHeadModule;

      const head = new TalkingHead(avatarContainerRef.current, {
        ttsLang: 'en',
        lipsyncLang: 'en',
        cameraView: 'upper',
        cameraDistance: 0.5,
        cameraY: 0,
        avatarMood: 'neutral',
        lightPosition: { x: 0, y: 5, z: 5 },
        lightTarget: { x: 0, y: 0, z: 0 },
        lightColor: 0xffffff,
        lightIntensity: 1.5,
      });

      setLoadingStatus('Loading model...');
      const avatarPromise = head.showAvatar({
        url: currentAvatar.url,
        body: currentAvatar.body,
        avatarMood: 'neutral',
        cameraView: 'upper',
        cameraDistance: 0.5,
        cameraX: 0,
        cameraY: 0,
        cameraRotation: 0,
      });
      const avatarTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Avatar timeout')), 30000)
      );

      await Promise.race([avatarPromise, avatarTimeout]);

      headRef.current = head;
      setAvatarReady(true);
      setLoadingStatus(`✓ ${currentAvatar.name} ready!`);
      console.log('✅ Avatar loaded:', currentAvatar.name);
    } catch (error: any) {
      console.error('❌ Avatar failed:', error);
      setAvatarError(error.message || 'Failed');
      setLoadingStatus('Chat still works');
    }
  }, [currentAvatar, avatarReady]);

  const handleAvatarChange = React.useCallback(
    (newAvatarId: string) => {
      console.log('🔄 Changing avatar to:', newAvatarId);
      if (soundEnabled) playSound('click');
      stopSpeaking();
      setAvatarReady(false);
      setAvatarError('');
      headRef.current = null;
      setSelectedAvatarId(newAvatarId);
    },
    [stopSpeaking, soundEnabled]
  );

  // ==================== HANDLERS ====================

  const startListening = React.useCallback(() => {
    if (recognitionRef.current && !isListening && !isLoading) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setInterimTranscript('');
        if (soundEnabled) playSound('click');
      } catch (error) {
        console.error('❌ Recognition failed:', error);
      }
    }
  }, [isListening, isLoading, soundEnabled]);

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [isListening]);

  const handleUserMessage = React.useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (soundEnabled) playSound('send');

      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setInterimTranscript('');
      setIsLoading(true);
      stopSpeaking();

      try {
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversation_history: messages,
          }),
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || 'Could not process that.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        if (soundEnabled) playSound('receive');
        await speak(assistantMessage.content);
      } catch (error: any) {
        console.error('❌ Backend error:', error);
        if (soundEnabled) playSound('error');
        const errorMessage: Message = {
          role: 'assistant',
          content: `Backend error: ${error.message}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [BACKEND_URL, messages, speak, stopSpeaking, soundEnabled]
  );

  // FEATURE: Clear Chat
  const clearChat = React.useCallback(() => {
    if (soundEnabled) playSound('click');
    stopSpeaking();
    setMessages([]);
  }, [stopSpeaking, soundEnabled]);

  // FEATURE: Copy Response
  const copyToClipboard = React.useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          if (soundEnabled) playSound('click');
          console.log('📋 Copied to clipboard');
        })
        .catch((err) => {
          console.error('❌ Copy failed:', err);
        });
    },
    [soundEnabled]
  );

  // FEATURE: Handle Suggested Question Click
  const handleSuggestedQuestion = React.useCallback(
    (question: string) => {
      if (soundEnabled) playSound('click');
      handleUserMessage(question);
    },
    [handleUserMessage, soundEnabled]
  );

  // ==================== EFFECTS ====================

  React.useEffect(() => {
    if (!isOpen) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const { transcript } = event.results[i][0];

        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        setInterimTranscript('');
        setIsListening(false);
        handleUserMessage(final);
      } else if (interim) {
        setInterimTranscript(interim);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript('');
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };
    recognitionRef.current = recognition;

    return () => recognition.abort();
  }, [isOpen, handleUserMessage]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setTimeout(() => {
            if (recognitionRef.current && !isListening) startListening();
          }, 300);
        } else if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isListening, startListening, stopListening]);

  React.useEffect(() => {
    if (isOpen && !avatarReady && !avatarError && !headRef.current) {
      const timer = setTimeout(initializeAvatar, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, avatarReady, avatarError, selectedAvatarId, initializeAvatar]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================== RENDER ====================

  const togglePanel = () => setIsOpen(!isOpen);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && inputText.length <= MAX_CHARS) {
      handleUserMessage(inputText);
    }
  };
  const toggleMute = () => {
    if (soundEnabled) playSound('click');
    if (!isMuted) stopSpeaking();
    setIsMuted(!isMuted);
  };
  const retryAvatar = () => {
    setAvatarReady(false);
    setAvatarError('');
    headRef.current = null;
  };
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <button className="assistant-toggle-button" onClick={togglePanel}>
        💬
      </button>

      {isOpen && <div className="assistant-backdrop" onClick={togglePanel} />}

      <div className={`assistant-panel ${isOpen ? 'open' : ''}`}>
        <div className="assistant-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <div>
              <h3>OptimusDB Assistant</h3>
              <small>Voice: {VOICE_HOTKEY.toUpperCase()}</small>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {avatarReady && (
              <span className="avatar-badge">🟢 {currentAvatar.name}</span>
            )}
            <button className="assistant-close-button" onClick={togglePanel}>
              ×
            </button>
          </div>
        </div>

        {/* Avatar Selector */}
        <div className="avatar-selector">
          <label htmlFor="avatar-select">Avatar:</label>
          <select
            id="avatar-select"
            value={selectedAvatarId}
            onChange={(e) => handleAvatarChange(e.target.value)}
            disabled={isSpeaking || isLoading}
            className="avatar-dropdown"
          >
            {AVATARS.map((avatar) => (
              <option key={avatar.id} value={avatar.id}>
                {avatar.name} - {avatar.description}
              </option>
            ))}
          </select>
        </div>

        {/* Avatar Container */}
        <div
          className="assistant-avatar-container"
          style={{
            backgroundImage: `url(${AVATAR_BACKGROUND})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div ref={avatarContainerRef} className="avatar-canvas" />

          {!avatarReady && !avatarError && (
            <div className="avatar-loading">
              <div className="spinner" />
              <p>{loadingStatus}</p>
              <small>First load: 10-20 seconds</small>
            </div>
          )}

          {avatarError && (
            <div className="avatar-error">
              <p className="error-title">⚠️ Avatar Failed</p>
              <p className="error-message">{avatarError}</p>
              <button className="retry-button" onClick={retryAvatar}>
                🔄 Retry
              </button>
              <small>💬 Chat still works</small>
            </div>
          )}

          {isSpeaking && (
            <div className="speaking-overlay">
              <div className="sound-wave">
                <div className="wave" />
                <div className="wave" />
                <div className="wave" />
              </div>
              <span>Speaking...</span>
              <button className="stop-btn" onClick={stopSpeaking}>
                ⏹ Stop
              </button>
            </div>
          )}

          {subtitles && <div className="subtitles-overlay">{subtitles}</div>}

          {isListening && (
            <div className="listening-overlay">
              <div className="pulse-ring" />
              <div className="pulse-ring" style={{ animationDelay: '0.5s' }} />
              <div className="mic-icon">🎤</div>
              {interimTranscript && (
                <div className="interim-text">{interimTranscript}</div>
              )}
            </div>
          )}
        </div>

        {/* FEATURE: Settings Bar */}
        <div className="settings-bar">
          {/* Voice Speed Slider */}
          <div className="setting-item">
            <label>🔊 Speed:</label>
            <input
              type="range"
              min="0.7"
              max="1.2"
              step="0.05"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="speed-slider"
            />
            <span className="speed-value">{voiceSpeed.toFixed(2)}</span>
          </div>

          {/* Toggles */}
          <div className="setting-toggles">
            <button
              className={`toggle-btn ${showTimestamps ? 'active' : ''}`}
              onClick={() => setShowTimestamps(!showTimestamps)}
              title="Toggle timestamps"
            >
              🕐
            </button>
            <button
              className={`toggle-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle sounds"
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>
            <button
              className="toggle-btn clear-btn"
              onClick={clearChat}
              title="Clear chat"
              disabled={messages.length === 0}
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="assistant-controls">
          <button
            className={`control-btn ${isListening ? 'active listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || !recognitionRef.current}
          >
            🎤
          </button>
          <button
            className={`control-btn ${!isMuted ? 'active' : ''}`}
            onClick={toggleMute}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div className="status-text">
            {isListening && '🎤 Listening...'}
            {isSpeaking && '🎭 Speaking...'}
            {isLoading && '💭 Thinking...'}
            {!isListening &&
              !isSpeaking &&
              !isLoading &&
              (avatarReady ? '✓ Ready' : '⏳ Loading...')}
          </div>
        </div>

        {/* Messages */}
        <div className="assistant-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-icon">👋</div>
              {/* FEATURE: Time-based Greeting */}
              <h4>{getGreeting()}</h4>
              <p>
                I'm <strong>{currentAvatar.name}</strong>, your{' '}
                {currentAvatar.description.toLowerCase()}.
              </p>

              {/* FEATURE: Suggested Questions */}
              <div className="suggested-questions">
                <p className="suggestions-label">💡 Try asking:</p>
                <div className="suggestions-grid">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((question, idx) => (
                    <button
                      key={idx}
                      className="suggestion-chip"
                      onClick={() => handleSuggestedQuestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-footer">
                  {/* FEATURE: Timestamps Toggle */}
                  {showTimestamps && (
                    <span className="message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                  {/* FEATURE: Copy Button */}
                  {msg.role === 'assistant' && (
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(msg.content)}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form className="assistant-input-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="assistant-input"
              placeholder={
                isListening
                  ? interimTranscript || 'Listening...'
                  : 'Type or press Ctrl+Shift+V...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
              disabled={isLoading || isListening}
              maxLength={MAX_CHARS}
            />
            {/* FEATURE: Character Counter */}
            <span
              className={`char-counter ${
                inputText.length >= MAX_CHARS ? 'limit' : ''
              }`}
            >
              {inputText.length}/{MAX_CHARS}
            </span>
          </div>
          <button
            type="submit"
            className="assistant-send-button"
            disabled={
              !inputText.trim() ||
              isLoading ||
              isListening ||
              inputText.length > MAX_CHARS
            }
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
      </div>
    </>
  );
};

export default DataCatalogAssistant;
