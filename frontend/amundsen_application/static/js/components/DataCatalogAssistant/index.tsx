// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// VERSION: Enhanced UI with Avatar

import * as React from 'react';
import './styles.scss';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TalkingHeadInstance {
  showAvatar: (options: any) => Promise<void>;
  speakText: (text: string) => Promise<void>;
  setView: (view: string) => void;
}

const DataCatalogAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [language, setLanguage] = React.useState('en-US');
  const [isMuted, setIsMuted] = React.useState(true);
  const [avatarReady, setAvatarReady] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string>('');
  const [loadingStatus, setLoadingStatus] =
    React.useState<string>('Not started');

  const avatarContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const headRef = React.useRef<TalkingHeadInstance | null>(null);

  // Backend configuration
  const BACKEND_URL =
    process.env.REACT_APP_OPTIMUSDB_URL || 'http://localhost:5002/chat';

  // Avatar configuration
  const AVATAR_URL =
    process.env.REACT_APP_AVATAR_URL ||
    'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024';

  // Initialize TalkingHead avatar
  const initializeAvatar = React.useCallback(async () => {
    if (!avatarContainerRef.current || headRef.current) {
      console.log('Avatar: Already initialized or container not ready');

      return;
    }

    console.log('🎭 Starting avatar initialization...');
    setLoadingStatus('Loading TalkingHead library...');
    setAvatarError('');

    try {
      const containerRect = avatarContainerRef.current.getBoundingClientRect();

      console.log('📐 Container dimensions:', {
        width: containerRect.width,
        height: containerRect.height,
      });

      if (containerRect.width === 0 || containerRect.height === 0) {
        throw new Error('Avatar container has zero dimensions');
      }

      console.log('📦 Importing TalkingHead library...');
      setLoadingStatus('Importing TalkingHead...');

      const TalkingHeadModule = await import('@met4citizen/talkinghead');

      // Handle different export patterns
      let TalkingHead;

      if (TalkingHeadModule.default) {
        TalkingHead = TalkingHeadModule.default;
        console.log('✅ Using default export');
      } else if (TalkingHeadModule.TalkingHead) {
        TalkingHead = TalkingHeadModule.TalkingHead;
        console.log('✅ Using named export');
      } else {
        TalkingHead = TalkingHeadModule;
        console.log('✅ Using module directly');
      }

      console.log('🔍 TalkingHead type:', typeof TalkingHead);

      if (typeof TalkingHead !== 'function') {
        throw new Error(
          `TalkingHead is not a constructor (type: ${typeof TalkingHead})`
        );
      }

      setLoadingStatus('Creating TalkingHead instance...');
      console.log('🎬 Creating TalkingHead instance...');

      const head = new TalkingHead(avatarContainerRef.current, {
        ttsLang: language.split('-')[0],
        lipsyncLang: language.split('-')[0],
        cameraView: 'upper',
        cameraDistance: 0.5,
        cameraY: 0,
        avatarMood: 'neutral',
      });

      console.log('✅ TalkingHead instance created');
      setLoadingStatus('Loading avatar model (10-15 seconds)...');

      console.log('📥 Loading avatar from URL:', AVATAR_URL);

      const avatarPromise = head.showAvatar({
        url: AVATAR_URL,
        body: 'F',
        avatarMood: 'neutral',
        ttsLang: language.split('-')[0],
        lipsyncLang: language.split('-')[0],
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Avatar loading timeout after 30 seconds')),
          30000
        );
      });

      await Promise.race([avatarPromise, timeoutPromise]);

      console.log('✅ Avatar loaded successfully!');
      headRef.current = head;
      setAvatarReady(true);
      setLoadingStatus('Avatar ready!');
    } catch (error: any) {
      console.error('❌ Failed to initialize avatar:', error);
      const errorMsg = error.message || 'Unknown error';

      setAvatarError(errorMsg);
      setLoadingStatus(`Error: ${errorMsg}`);
      console.log('🔍 Full error:', error);
    }
  }, [language, AVATAR_URL]);

  // Define handleUserMessage BEFORE useEffects
  const handleUserMessage = React.useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);

      try {
        console.log('📤 Sending message to backend:', BACKEND_URL);

        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            conversation_history: messages,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content:
            data.response ||
            'I apologize, but I could not process your request.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Speak response with avatar if not muted and avatar is ready
        if (!isMuted && headRef.current && avatarReady) {
          setIsSpeaking(true);
          try {
            await headRef.current.speakText(assistantMessage.content);
          } catch (error) {
            console.error('Error speaking:', error);
          }
          setIsSpeaking(false);
        }
      } catch (error: any) {
        console.error('❌ Error sending message:', error);
        const errorMessage: Message = {
          role: 'assistant',
          content: `Sorry, I couldn't connect to the backend at ${BACKEND_URL}. Error: ${error.message}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [BACKEND_URL, language, messages, isMuted, avatarReady]
  );

  // Initialize Speech Recognition
  React.useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');

      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      const { transcript } = event.results[0][0];

      handleUserMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isOpen, language, handleUserMessage]);

  // Initialize avatar when panel opens
  React.useEffect(() => {
    if (isOpen && !avatarReady && !headRef.current && !avatarError) {
      console.log('👁️ Panel opened, initializing avatar...');
      setTimeout(() => {
        initializeAvatar();
      }, 100);
    }
  }, [isOpen, avatarReady, avatarError, initializeAvatar]);

  // Auto-scroll to bottom of messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const togglePanel = () => {
    console.log('🔄 Toggling panel:', !isOpen);
    setIsOpen(!isOpen);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserMessage(inputText);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const retryAvatar = () => {
    console.log('🔄 Retrying avatar initialization...');
    setAvatarReady(false);
    setAvatarError('');
    setLoadingStatus('Retrying...');
    headRef.current = null;
    setTimeout(() => {
      initializeAvatar();
    }, 100);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className="assistant-toggle-button"
        onClick={togglePanel}
        aria-label="Toggle AI Assistant"
        title="AI Assistant"
      >
        🤖
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="assistant-backdrop"
          onClick={togglePanel}
          role="presentation"
        />
      )}

      {/* Main Panel */}
      <div className={`assistant-panel ${isOpen ? 'open' : ''}`}>
        {/* Enhanced Header with Icon */}
        <div
          className="assistant-header"
          style={{
            background: 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)',
            borderBottom: '3px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <h3
              style={{
                color: 'white',
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              Data Catalog Assistant
            </h3>
          </div>
          <button
            className="assistant-close-button"
            onClick={togglePanel}
            aria-label="Close Assistant"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ×
          </button>
        </div>

        {/* Avatar Container */}
        <div className="assistant-avatar-container">
          <div ref={avatarContainerRef} className="avatar-canvas" />

          {!avatarReady && !avatarError && (
            <div className="avatar-loading">
              <div className="spinner" />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>
                {loadingStatus}
              </p>
              <small
                style={{ marginTop: '8px', opacity: 0.8, fontSize: '12px' }}
              >
                First load may take 10-15 seconds...
              </small>
            </div>
          )}

          {avatarError && (
            <div
              className="avatar-loading"
              style={{ background: 'rgba(239, 68, 68, 0.9)' }}
            >
              <p
                style={{
                  fontSize: '18px',
                  marginBottom: '12px',
                  fontWeight: 'bold',
                }}
              >
                ⚠️ Avatar Loading Failed
              </p>
              <p
                style={{
                  fontSize: '13px',
                  marginBottom: '16px',
                  maxWidth: '320px',
                  lineHeight: '1.5',
                }}
              >
                {avatarError}
              </p>
              <button
                onClick={retryAvatar}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                🔄 Retry Loading Avatar
              </button>
              <p style={{ fontSize: '12px', marginTop: '16px', opacity: 0.95 }}>
                💬 Chat functionality works without avatar
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="assistant-controls">
          <button
            className={`control-button ${isListening ? 'active' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || !recognitionRef.current}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            🎤
          </button>

          <button
            className={`control-button ${!isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            disabled={!avatarReady}
            title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <select
            className="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLoading}
          >
            <option value="en-US">🇺🇸 English (US)</option>
            <option value="en-GB">🇬🇧 English (UK)</option>
            <option value="es-ES">🇪🇸 Español</option>
            <option value="fr-FR">🇫🇷 Français</option>
            <option value="de-DE">🇩🇪 Deutsch</option>
            <option value="it-IT">🇮🇹 Italiano</option>
            <option value="pt-BR">🇧🇷 Português</option>
          </select>
        </div>

        {/* Status Bar */}
        <div className="assistant-status-bar">
          {isListening && (
            <span className="status-indicator listening">🎤 Listening...</span>
          )}
          {isSpeaking && (
            <span className="status-indicator speaking">🔊 Speaking...</span>
          )}
          {isLoading && (
            <span className="status-indicator loading">💬 Thinking...</span>
          )}
          {!isListening && !isSpeaking && !isLoading && (
            <span className="status-indicator ready">
              {avatarReady
                ? '✓ Ready with avatar'
                : avatarError
                ? '⚠️ Chat active (no avatar)'
                : '⏳ Loading avatar...'}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="assistant-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👋</div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                Hi! I'm your data catalog assistant.
              </p>
              <p
                style={{ fontSize: '14px', marginBottom: '16px', opacity: 0.8 }}
              >
                Ask me anything about your datasets, or try:
              </p>
              <ul style={{ textAlign: 'left', marginBottom: '16px' }}>
                <li>"Show me tables related to customers"</li>
                <li>"What's in the sales_fact table?"</li>
                <li>"Find datasets owned by data team"</li>
              </ul>
              {avatarError && (
                <p
                  style={{
                    fontSize: '12px',
                    marginTop: '16px',
                    color: '#ef4444',
                  }}
                >
                  Note: Avatar failed to load, but all chat features work
                  normally.
                </p>
              )}
              <div
                style={{
                  fontSize: '11px',
                  marginTop: '20px',
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                }}
              >
                Backend: {BACKEND_URL}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Text Input */}
        <form className="assistant-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="assistant-input"
            placeholder="Type your message or use voice..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="assistant-send-button"
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? '⏳' : '📤'} Send
          </button>
        </form>
      </div>
    </>
  );
};

export default DataCatalogAssistant;
