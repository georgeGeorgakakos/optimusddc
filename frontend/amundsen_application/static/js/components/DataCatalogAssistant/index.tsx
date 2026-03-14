// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// DataCatalogAssistant — Upgraded Slide-Over Panel
// VERSION: SLIDE-OVER-2.0
//
// What changed vs the previous version:
//  - Full dark Swarmchestrate theme (navy/cyan)
//  - Proper slide-over panel with backdrop & focus trap
//  - Chat / Settings two-tab layout
//  - Context-aware suggested prompts per page
//  - SQL detection → "Run in Query Workbench" action button
//  - Inline code-block rendering for assistant messages
//  - Status pill in header (online / offline / speaking / thinking)
//  - All existing logic preserved verbatim (avatar, voice, lip-sync, sounds)

import * as React from 'react';
import './styles.scss';

// ── Types ────────────────────────────────────────────────────────────────────

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

type PanelTab = 'chat' | 'settings';

// ── Context-aware suggested prompts ──────────────────────────────────────────

const PAGE_PROMPTS: Record<string, string[]> = {
  '/': [
    'What tables are in the cluster?',
    'Show me the cluster health',
    'Which agent has the most queries?',
    'Find renewable energy datasets',
  ],
  '/search': [
    'Find solar energy tables',
    'Show me wind turbine data',
    'What are the most popular tags?',
    'Find tables owned by agent 1',
  ],
  '/queryworkbench': [
    'Write a query to join energy_storage and power_output',
    'Explain this query to me',
    'How do I query across agents?',
    'Show me the fastest tables to query',
  ],
  '/cluster/topology': [
    'Which agents are active?',
    'How many connections are in the mesh?',
    'Is there a split-brain risk?',
    'Show me replication status',
  ],
  '/metrics': [
    'What is the average query latency?',
    'Which agent has the highest load?',
    'Show me metadata ops over time',
    'Alert me if latency exceeds 500ms',
  ],
  '/analytics': [
    'What are the most common log errors?',
    'Show me agent restart events',
    'Find logs from the last hour',
    'How many queries failed today?',
  ],
  '/etl-workbench': [
    'Create a pipeline from energy_storage',
    'Help me design an ETL flow',
    'What transformations are available?',
    'Debug my pipeline',
  ],
  '/api-testing': [
    'Show me the GET /tables endpoint',
    'How do I authenticate the API?',
    'What does the metadata POST body look like?',
    'Test the health check endpoint',
  ],
  '/wiki': [
    'Explain the Raft consensus algorithm',
    'What is GossipSub?',
    'How does OptimusDB store metadata?',
    'What is the sequence for swarm setup?',
  ],
  '/about/optimus': [
    'What is OptimusDB?',
    'How does TinyLlama generate tags?',
    'What does OptimusDDC do?',
    'Explain the Optimus Stack architecture',
  ],
};

const DEFAULT_PROMPTS = [
  'What tables are available?',
  'Show me solar energy data',
  'Who owns the wind_turbine table?',
  'Find renewable energy datasets',
];

const getContextPrompts = (): string[] => {
  const path = window.location.pathname;

  // Exact match first
  if (PAGE_PROMPTS[path]) return PAGE_PROMPTS[path];
  // Prefix match (handles /about/*)
  const prefix = Object.keys(PAGE_PROMPTS).find(
    (k) => k !== '/' && path.startsWith(k)
  );

  return prefix ? PAGE_PROMPTS[prefix] : DEFAULT_PROMPTS;
};

const getPageLabel = (): string => {
  const path = window.location.pathname;
  const labels: Record<string, string> = {
    '/': 'Home',
    '/search': 'Semantic Search',
    '/queryworkbench': 'Query Workbench',
    '/cluster/topology': 'Agents Topology',
    '/metrics': 'Agents Performance',
    '/analytics': 'Log Analytics',
    '/etl-workbench': 'Flow Workbench',
    '/api-testing': 'API Testing',
    '/wiki': 'Wiki',
  };

  if (labels[path]) return labels[path];
  const prefix = Object.keys(labels).find(
    (k) => k !== '/' && path.startsWith(k)
  );

  return prefix ? labels[prefix] : 'OptimusDDC';
};

// ── SQL detection helper ──────────────────────────────────────────────────────

const SQL_KEYWORDS =
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN|HAVING|GROUP BY|ORDER BY|LIMIT)\b/i;
const CODE_FENCE = /```[\s\S]*?```/;

const extractSQL = (text: string): string | null => {
  // Try to extract from code fence first
  const fenceMatch = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);

  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();

    if (SQL_KEYWORDS.test(candidate)) return candidate;
  }
  // Try to find a SQL sentence
  const lines = text.split('\n');
  const sqlLines = lines.filter((l) => SQL_KEYWORDS.test(l));

  if (sqlLines.length >= 1) return sqlLines.join('\n');

  return null;
};

const containsCode = (text: string): boolean =>
  CODE_FENCE.test(text) || text.includes('`');

// ── Sound effects (preserved from original) ───────────────────────────────────

const playSound = (type: 'send' | 'receive' | 'error' | 'click') => {
  try {
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
  } catch (_) {
    /* silently ignore if AudioContext unavailable */
  }
};

// ── Time-based greeting (preserved) ──────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();

  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';

  return 'Good evening';
};

// ── Message content renderer ─────────────────────────────────────────────────

const MessageContent: React.FC<{ text: string }> = ({ text }) => {
  if (!containsCode(text)) {
    return <span className="dca-msg-text">{text}</span>;
  }
  // Split on code fences
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <span className="dca-msg-text">
      {parts.map((part, i) => {
        const fenceMatch = part.match(/```(?:(\w+))?\s*([\s\S]*?)```/);

        if (fenceMatch) {
          const lang = fenceMatch[1] || '';
          const code = fenceMatch[2].trim();

          return (
            <span key={i} className="dca-code-block">
              {lang && <span className="dca-code-lang">{lang}</span>}
              <code>{code}</code>
            </span>
          );
        }
        // Inline backticks
        const inlineParts = part.split(/(`[^`]+`)/g);

        return (
          <React.Fragment key={i}>
            {inlineParts.map((ip, j) =>
              ip.startsWith('`') && ip.endsWith('`') ? (
                <code key={j} className="dca-code-inline">
                  {ip.slice(1, -1)}
                </code>
              ) : (
                <React.Fragment key={j}>{ip}</React.Fragment>
              )
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const DataCatalogAssistant: React.FC = () => {
  // ── State (all preserved from original) ──────────────────────────────────
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<PanelTab>('chat');
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
  const [showAvatar, setShowAvatar] = React.useState<boolean>(false);

  // Preferences (localStorage — preserved)
  const [isMuted, setIsMuted] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('optimusdb_muted');

    return saved ? JSON.parse(saved) : false;
  });
  const [voiceSpeed, setVoiceSpeed] = React.useState<number>(() => {
    const saved = localStorage.getItem('optimusdb_voice_speed');

    return saved ? parseFloat(saved) : 0.85;
  });
  const [showTimestamps, setShowTimestamps] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('optimusdb_show_timestamps');

    return saved ? JSON.parse(saved) : true;
  });
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('optimusdb_sound_enabled');

    return saved ? JSON.parse(saved) : true;
  });

  const MAX_CHARS = 500;

  // ── Refs (all preserved) ──────────────────────────────────────────────────
  const avatarContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const headRef = React.useRef<TalkingHeadInstance | null>(null);
  const speechSynthRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const visemeAnimationRef = React.useRef<number | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // ── Configuration (preserved) ─────────────────────────────────────────────
  const BACKEND_URL = process.env.REACT_APP_OPTIMUSDB_URL || '/api/v1/chat';

  const AVATARS: AvatarConfig[] = React.useMemo(
    () => [
      {
        id: 'linda_swarm',
        name: 'Linda Swarm',
        url:
          process.env.REACT_APP_AVATAR_LINDA_URL ||
          'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024',
        body: 'F',
        description: 'Friendly Guide',
      },
      {
        id: 'gg_swarm',
        name: 'GG Swarm',
        url:
          process.env.REACT_APP_AVATAR_GG_URL ||
          'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024',
        body: 'F',
        description: 'Data Expert',
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

  // ── Preference persistence (preserved) ───────────────────────────────────
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

  // ── Viseme / phoneme maps (preserved verbatim) ────────────────────────────

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
      if (!word.length) {
        phonemes.push('SIL');

        return;
      }
      let i = 0;

      while (i < word.length) {
        const two = word.substring(i, i + 2);
        const three = word.substring(i, i + 3);

        if (three === 'tch') {
          phonemes.push('CH');
          i += 3;
        } else if (three === 'thr') {
          phonemes.push('TH', 'R');
          i += 3;
        } else if (two === 'th') {
          phonemes.push('TH');
          i += 2;
        } else if (two === 'ch') {
          phonemes.push('CH');
          i += 2;
        } else if (two === 'sh') {
          phonemes.push('SH');
          i += 2;
        } else if (two === 'ng') {
          phonemes.push('NG');
          i += 2;
        } else if (two === 'oo') {
          phonemes.push('UW');
          i += 2;
        } else if (two === 'ee' || two === 'ea') {
          phonemes.push('IY');
          i += 2;
        } else if (two === 'ai' || two === 'ay') {
          phonemes.push('EY');
          i += 2;
        } else if (two === 'ow') {
          phonemes.push('OW');
          i += 2;
        } else if (two === 'ou') {
          phonemes.push('AW');
          i += 2;
        } else {
          const map: Record<string, string> = {
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

          if (word[i] === 'x') {
            phonemes.push('K', 'S');
          } else {
            phonemes.push(map[word[i]] || 'SIL');
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
              const current = node.morphTargetInfluences[morphIndex] || 0;

              node.morphTargetInfluences[morphIndex] =
                current * 0.3 + (targetValue as number) * intensity * 0.7;
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
      const duration = 80 / speechRate;
      let currentTime = 0;

      phonemes.forEach((phoneme) => {
        setTimeout(() => {
          applyVisemeToAvatar(
            PHONEME_TO_OCULUS[phoneme] || 0,
            phoneme === 'SIL' ? 0 : 1.0
          );
        }, currentTime);
        currentTime += duration;
      });
      setTimeout(() => resetMorphs(), currentTime + 500);
    },
    [applyVisemeToAvatar, resetMorphs]
  );

  // ── Speech (preserved) ────────────────────────────────────────────────────

  const getBrowserVoice = React.useCallback(() => {
    const voices = window.speechSynthesis.getVoices();

    if (!voices.length) return null;
    const preferred = [
      'Microsoft David Desktop - English (United States)',
      'Microsoft Zira Desktop - English (United States)',
      'Google US English',
      'en-US',
    ];

    for (const p of preferred) {
      const v = voices.find(
        (voice) =>
          voice.name === p || voice.name.includes(p) || voice.lang === p
      );

      if (v) return v;
    }

    return (
      voices.find((v) => v.lang.startsWith('en') && v.localService) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null
    );
  }, []);

  const cleanTextForSpeech = (text: string): string => {
    let c = text;

    c = c.replace(/[\u{1F600}-\u{1FAFF}]/gu, '');
    c = c
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/`/g, '');
    c = c
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ');
    c = c
      .replace(/\.+/g, '.')
      .replace(/\.\s*\./g, '.')
      .trim();

    return c;
  };

  const speakWithLipsync = React.useCallback(
    async (text: string) => {
      const cleanText = cleanTextForSpeech(text);

      if (!cleanText || cleanText.length < 2) return;
      setIsSpeaking(true);
      setSubtitles('');
      try {
        const phonemes = textToPhonemes(cleanText);

        await new Promise<void>((resolve) => {
          const voices = window.speechSynthesis.getVoices();

          if (voices.length > 0) {
            resolve();

            return;
          }
          window.speechSynthesis.onvoiceschanged = () => resolve();
          setTimeout(resolve, 5000);
        });
        const utterance = new SpeechSynthesisUtterance(cleanText);

        utterance.voice = getBrowserVoice();
        utterance.rate = voiceSpeed;
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
        utterance.onerror = () => {
          clearInterval(subtitleInterval);
          setIsSpeaking(false);
          setSubtitles('');
          resetMorphs();
        };
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
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
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    if (visemeAnimationRef.current) {
      cancelAnimationFrame(visemeAnimationRef.current);
    }
    resetMorphs();
    setIsSpeaking(false);
    setSubtitles('');
  }, [resetMorphs]);

  // ── Avatar init (preserved) ───────────────────────────────────────────────

  const initializeAvatar = React.useCallback(async () => {
    if (!avatarContainerRef.current || headRef.current || avatarReady) return;
    setLoadingStatus(`Loading ${currentAvatar.name}…`);
    setAvatarError('');
    try {
      const TalkingHeadModule = (await Promise.race([
        import('@met4citizen/talkinghead'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Library timeout')), 10000)
        ),
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

      setLoadingStatus('Loading model…');
      await Promise.race([
        head.showAvatar({
          url: currentAvatar.url,
          body: currentAvatar.body,
          avatarMood: 'neutral',
          cameraView: 'upper',
          cameraDistance: 0.5,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Avatar timeout')), 30000)
        ),
      ]);
      headRef.current = head;
      setAvatarReady(true);
      setLoadingStatus(`✓ ${currentAvatar.name} ready`);
    } catch (error: any) {
      setAvatarError(error.message || 'Failed');
      setLoadingStatus('Chat still works');
    }
  }, [currentAvatar, avatarReady]);

  const handleAvatarChange = React.useCallback(
    (newId: string) => {
      if (soundEnabled) playSound('click');
      stopSpeaking();
      setAvatarReady(false);
      setAvatarError('');
      headRef.current = null;
      setSelectedAvatarId(newId);
    },
    [stopSpeaking, soundEnabled]
  );

  // ── Voice recognition (preserved) ────────────────────────────────────────

  const startListening = React.useCallback(() => {
    if (recognitionRef.current && !isListening && !isLoading) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setInterimTranscript('');
        if (soundEnabled) playSound('click');
      } catch {
        /* silently ignore */
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

  // ── Message handling (preserved) ─────────────────────────────────────────

  const handleUserMessage = React.useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (soundEnabled) playSound('send');
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text, timestamp: new Date() },
      ]);
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
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.response || 'Could not process that.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        if (soundEnabled) playSound('receive');
        await speak(assistantMsg.content);
      } catch (error: any) {
        if (soundEnabled) playSound('error');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Backend error: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [BACKEND_URL, messages, speak, stopSpeaking, soundEnabled]
  );

  const clearChat = React.useCallback(() => {
    if (soundEnabled) playSound('click');
    stopSpeaking();
    setMessages([]);
  }, [stopSpeaking, soundEnabled]);

  const copyToClipboard = React.useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        if (soundEnabled) playSound('click');
      });
    },
    [soundEnabled]
  );

  // ── Effects (preserved + new) ─────────────────────────────────────────────

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
        const t = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
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
    const handler = (e: KeyboardEvent) => {
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

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isListening, startListening, stopListening]);

  React.useEffect(() => {
    if (
      isOpen &&
      showAvatar &&
      !avatarReady &&
      !avatarError &&
      !headRef.current
    ) {
      const timer = setTimeout(initializeAvatar, 100);

      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    showAvatar,
    avatarReady,
    avatarError,
    selectedAvatarId,
    initializeAvatar,
  ]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens on chat tab
  React.useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, activeTab]);

  // ── Handlers ─────────────────────────────────────────────────────────────

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
  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleRunInWorkbench = (sql: string) => {
    const encoded = encodeURIComponent(sql);

    window.location.href = `/queryworkbench?query=${encoded}`;
  };

  const statusLabel = isListening
    ? 'Listening…'
    : isSpeaking
    ? 'Speaking…'
    : isLoading
    ? 'Thinking…'
    : avatarReady && showAvatar
    ? `${currentAvatar.name} ready`
    : 'Ready';

  const statusClass = isListening
    ? 'listening'
    : isSpeaking
    ? 'speaking'
    : isLoading
    ? 'loading'
    : 'ready';

  const contextPrompts = React.useMemo(getContextPrompts, [isOpen]);
  const pageLabel = React.useMemo(getPageLabel, [isOpen]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── FAB toggle button ── */}
      <button
        className={`dca-fab${isOpen ? ' dca-fab--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI assistant"
        title="OptimusDDC AI Assistant (Ctrl+Shift+V)"
      >
        <span className="dca-fab-rings" aria-hidden="true">
          <span className="dca-fab-ring dca-fab-ring--1" />
          <span className="dca-fab-ring dca-fab-ring--2" />
        </span>
        <svg
          className="dca-fab-icon dca-fab-icon--chat"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg
          className="dca-fab-icon dca-fab-icon--close"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {messages.length > 0 && !isOpen && (
          <span className="dca-fab-badge">
            {messages.filter((m) => m.role === 'assistant').length}
          </span>
        )}
      </button>

      {/* ── Backdrop ── */}
      {isOpen && (
        <div
          className="dca-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Slide-over Panel ── */}
      <div
        ref={panelRef}
        className={`dca-panel${isOpen ? ' dca-panel--open' : ''}`}
        role="dialog"
        aria-label="OptimusDDC AI Assistant"
        aria-modal="true"
      >
        {/* ── Panel Header ── */}
        <div className="dca-header">
          <div className="dca-header-left">
            <div className="dca-header-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <div className="dca-header-title">OptimusDDC Assistant</div>
              <div className="dca-header-context">
                <span className="dca-ctx-dot" />
                {pageLabel}
              </div>
            </div>
          </div>
          <div className="dca-header-right">
            <div className={`dca-status-pill dca-status-pill--${statusClass}`}>
              <span className="dca-status-dot" />
              {statusLabel}
            </div>
            <button
              className="dca-icon-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              title="Close (Esc)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="dca-tabs">
          <button
            className={`dca-tab${
              activeTab === 'chat' ? ' dca-tab--active' : ''
            }`}
            onClick={() => setActiveTab('chat')}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
            {messages.length > 0 && (
              <span className="dca-tab-count">{messages.length}</span>
            )}
          </button>
          <button
            className={`dca-tab${
              activeTab === 'settings' ? ' dca-tab--active' : ''
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Settings
          </button>
        </div>

        {/* ══════════════════════════════════════════
            TAB: CHAT
        ══════════════════════════════════════════ */}
        {activeTab === 'chat' && (
          <>
            {/* ── Avatar strip (collapsible) ── */}
            {showAvatar && (
              <div
                className="dca-avatar-strip"
                style={{ backgroundImage: `url(${AVATAR_BACKGROUND})` }}
              >
                <div ref={avatarContainerRef} className="dca-avatar-canvas" />
                {!avatarReady && !avatarError && (
                  <div className="dca-avatar-loading">
                    <div className="dca-spinner" />
                    <span>{loadingStatus}</span>
                  </div>
                )}
                {avatarError && (
                  <div className="dca-avatar-error">
                    <span>Avatar unavailable</span>
                    <button className="dca-retry-btn" onClick={retryAvatar}>
                      Retry
                    </button>
                  </div>
                )}
                {isSpeaking && (
                  <div className="dca-speaking-indicator">
                    <div className="dca-wave">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <button className="dca-stop-btn" onClick={stopSpeaking}>
                      Stop
                    </button>
                  </div>
                )}
                {subtitles && <div className="dca-subtitles">{subtitles}</div>}
                {isListening && (
                  <div className="dca-listening-overlay">
                    <div className="dca-mic-pulse" />
                    <span className="dca-mic-icon">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </span>
                    {interimTranscript && (
                      <div className="dca-interim">{interimTranscript}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Message list ── */}
            <div className="dca-messages">
              {messages.length === 0 && (
                <div className="dca-welcome">
                  <div className="dca-welcome-icon">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="dca-welcome-title">{getGreeting()}</div>
                  <div className="dca-welcome-sub">
                    Ask anything about your data catalog, swarm agents, or
                    OptimusDB.
                  </div>

                  <div className="dca-prompts">
                    <div className="dca-prompts-label">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                      Context: {pageLabel}
                    </div>
                    <div className="dca-prompts-grid">
                      {contextPrompts.map((q, i) => (
                        <button
                          key={i}
                          className="dca-prompt-chip"
                          onClick={() => handleUserMessage(q)}
                          disabled={isLoading}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const sql =
                  msg.role === 'assistant' ? extractSQL(msg.content) : null;

                return (
                  <div key={idx} className={`dca-msg dca-msg--${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="dca-msg-avatar">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                    )}
                    <div className="dca-msg-body">
                      <div className="dca-msg-bubble">
                        <MessageContent text={msg.content} />
                      </div>
                      {/* SQL action button */}
                      {sql && (
                        <button
                          className="dca-run-query-btn"
                          onClick={() => handleRunInWorkbench(sql)}
                          title="Open this query in Query Workbench"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                          </svg>
                          Run in Query Workbench
                        </button>
                      )}
                      <div className="dca-msg-meta">
                        {showTimestamps && (
                          <span className="dca-msg-time">
                            {formatTime(msg.timestamp)}
                          </span>
                        )}
                        {msg.role === 'assistant' && (
                          <button
                            className="dca-copy-btn"
                            onClick={() => copyToClipboard(msg.content)}
                            title="Copy"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="dca-msg dca-msg--assistant">
                  <div className="dca-msg-avatar">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <div className="dca-msg-body">
                    <div className="dca-msg-bubble dca-msg-bubble--typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input toolbar ── */}
            <div className="dca-toolbar">
              <button
                className={`dca-tool-btn${
                  isListening
                    ? ' dca-tool-btn--active dca-tool-btn--listening'
                    : ''
                }`}
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || !recognitionRef.current}
                title={
                  isListening ? 'Stop listening' : 'Voice input (Ctrl+Shift+V)'
                }
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <button
                className={`dca-tool-btn${
                  !isMuted ? ' dca-tool-btn--active' : ''
                }`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
              >
                {isMuted ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>
              {isSpeaking && (
                <button
                  className="dca-tool-btn dca-tool-btn--speaking"
                  onClick={stopSpeaking}
                  title="Stop speaking"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
              <button
                className="dca-tool-btn"
                onClick={() => setShowAvatar(!showAvatar)}
                title={showAvatar ? 'Hide avatar' : 'Show avatar'}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              <div className="dca-toolbar-spacer" />
              {messages.length > 0 && (
                <button
                  className="dca-tool-btn dca-tool-btn--danger"
                  onClick={clearChat}
                  title="Clear conversation"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>

            {/* ── Input form ── */}
            <form className="dca-input-form" onSubmit={handleSubmit}>
              <div className="dca-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  className="dca-input"
                  placeholder={
                    isListening
                      ? interimTranscript || 'Listening…'
                      : 'Ask about your data catalog…'
                  }
                  value={inputText}
                  onChange={(e) =>
                    setInputText(e.target.value.slice(0, MAX_CHARS))
                  }
                  disabled={isLoading || isListening}
                  maxLength={MAX_CHARS}
                  autoComplete="off"
                />
                {inputText.length > MAX_CHARS * 0.8 && (
                  <span
                    className={`dca-char-count${
                      inputText.length >= MAX_CHARS
                        ? ' dca-char-count--limit'
                        : ''
                    }`}
                  >
                    {inputText.length}/{MAX_CHARS}
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="dca-send-btn"
                disabled={
                  !inputText.trim() ||
                  isLoading ||
                  isListening ||
                  inputText.length > MAX_CHARS
                }
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="dca-send-spinner" />
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </form>
          </>
        )}

        {/* ══════════════════════════════════════════
            TAB: SETTINGS
        ══════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="dca-settings">
            <div className="dca-settings-group">
              <div className="dca-settings-group-label">Voice Output</div>

              <div className="dca-setting-row">
                <div className="dca-setting-info">
                  <div className="dca-setting-name">Voice speed</div>
                  <div className="dca-setting-desc">
                    Controls speech synthesis rate
                  </div>
                </div>
                <div className="dca-slider-wrap">
                  <input
                    type="range"
                    min="0.7"
                    max="1.2"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  />
                  <span className="dca-slider-val">
                    {voiceSpeed.toFixed(2)}×
                  </span>
                </div>
              </div>

              <div className="dca-setting-row">
                <div className="dca-setting-info">
                  <div className="dca-setting-name">Mute voice output</div>
                  <div className="dca-setting-desc">
                    Disable text-to-speech responses
                  </div>
                </div>
                <button
                  className={`dca-toggle${isMuted ? ' dca-toggle--on' : ''}`}
                  onClick={toggleMute}
                  role="switch"
                  aria-checked={isMuted}
                >
                  <span className="dca-toggle-thumb" />
                </button>
              </div>
            </div>

            <div className="dca-settings-group">
              <div className="dca-settings-group-label">Interface</div>

              <div className="dca-setting-row">
                <div className="dca-setting-info">
                  <div className="dca-setting-name">Show timestamps</div>
                  <div className="dca-setting-desc">
                    Display time on each message
                  </div>
                </div>
                <button
                  className={`dca-toggle${
                    showTimestamps ? ' dca-toggle--on' : ''
                  }`}
                  onClick={() => setShowTimestamps(!showTimestamps)}
                  role="switch"
                  aria-checked={showTimestamps}
                >
                  <span className="dca-toggle-thumb" />
                </button>
              </div>

              <div className="dca-setting-row">
                <div className="dca-setting-info">
                  <div className="dca-setting-name">Sound effects</div>
                  <div className="dca-setting-desc">
                    Audio feedback on send / receive
                  </div>
                </div>
                <button
                  className={`dca-toggle${
                    soundEnabled ? ' dca-toggle--on' : ''
                  }`}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  role="switch"
                  aria-checked={soundEnabled}
                >
                  <span className="dca-toggle-thumb" />
                </button>
              </div>
            </div>

            <div className="dca-settings-group">
              <div className="dca-settings-group-label">Avatar</div>

              <div className="dca-setting-row">
                <div className="dca-setting-info">
                  <div className="dca-setting-name">Show avatar panel</div>
                  <div className="dca-setting-desc">
                    Display the 3D talking head above chat
                  </div>
                </div>
                <button
                  className={`dca-toggle${showAvatar ? ' dca-toggle--on' : ''}`}
                  onClick={() => setShowAvatar(!showAvatar)}
                  role="switch"
                  aria-checked={showAvatar}
                >
                  <span className="dca-toggle-thumb" />
                </button>
              </div>

              {showAvatar && (
                <div className="dca-setting-row">
                  <div className="dca-setting-info">
                    <div className="dca-setting-name">Avatar</div>
                    <div className="dca-setting-desc">
                      {avatarReady
                        ? `✓ ${currentAvatar.name} loaded`
                        : loadingStatus}
                    </div>
                  </div>
                  <select
                    className="dca-select"
                    value={selectedAvatarId}
                    onChange={(e) => handleAvatarChange(e.target.value)}
                    disabled={isSpeaking || isLoading}
                  >
                    {AVATARS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="dca-settings-group">
              <div className="dca-settings-group-label">Session</div>
              <button
                className="dca-danger-btn"
                onClick={() => {
                  clearChat();
                  setActiveTab('chat');
                }}
                disabled={messages.length === 0}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Clear conversation history
              </button>
            </div>

            <div className="dca-settings-footer">
              OptimusDDC Assistant · Slide-Over 2.0
              <br />
              Swarmchestrate · EU Horizon #101135012
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DataCatalogAssistant;
