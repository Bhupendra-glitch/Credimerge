import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isVoice?: boolean;
  audioBase64?: string | null;
  ttsEngine?: string;
}

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [micError, setMicError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const { user } = useAuth();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'ai',
      text: 'Hi. I am your ElevenLabs voice-enabled financial assistant. You can speak to me with the microphone or type below.',
    },
  ]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusText]);

  // Stop recording timer when recording ends
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Clean up any playing audio on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveAudioId(null);
  };

  const playAssistantSpeech = (messageId: string, text: string, audioBase64?: string | null) => {
    stopCurrentAudio();

    // 1. If ElevenLabs MP3 audio is available, play native audio
    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        currentAudioRef.current = audio;
        setActiveAudioId(messageId);

        audio.onended = () => {
          setActiveAudioId(null);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          fallbackWebSpeech(messageId, text);
        };

        audio.play().catch(() => fallbackWebSpeech(messageId, text));
        return;
      } catch {
        fallbackWebSpeech(messageId, text);
        return;
      }
    }

    // 2. Client-side natural speech synthesis fallback
    fallbackWebSpeech(messageId, text);
  };

  const fallbackWebSpeech = (messageId: string, text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*#_`]/g, '').slice(0, 350); // Clean markdown
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';

    // Pick natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find((v) => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;

    setActiveAudioId(messageId);
    utterance.onend = () => setActiveAudioId(null);
    utterance.onerror = () => setActiveAudioId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Text-based send
  const sendText = async () => {
    if (!input.trim() || loading) return;

    const q = input.trim();
    const userMsgId = `user-${Date.now()}`;
    setMessages((m) => [...m, { id: userMsgId, role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    setStatusText('Thinking...');

    try {
      const response = await api.voiceChat({ text: q });
      const answer = response.data.reply || 'I could not generate a response.';
      const aiMsgId = `ai-${Date.now()}`;

      setMessages((m) => [
        ...m,
        {
          id: aiMsgId,
          role: 'ai',
          text: answer,
          audioBase64: response.data.audioBase64,
          ttsEngine: response.data.ttsEngine,
        },
      ]);

      if (voiceEnabled) {
        playAssistantSpeech(aiMsgId, answer, response.data.audioBase64);
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Unable to generate financial response.';
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'ai', text: message }]);
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    setMicError('');
    stopCurrentAudio();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Microphone recording is not supported in this browser. Please type below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop()); // Release mic
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        if (audioBlob.size > 100) {
          await processVoiceInput(audioBlob);
        } else {
          setMicError('Recording was too short. Please hold or speak and try again.');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission was denied. Please allow microphone in browser settings or type below.');
      } else {
        setMicError('Could not access microphone. Text fallback is active.');
      }
      setIsRecording(false);
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process recorded audio through ElevenLabs Scribe STT -> AI -> TTS
  const processVoiceInput = async (audioBlob: Blob) => {
    setLoading(true);
    setStatusText('Transcribing with ElevenLabs Scribe...');

    try {
      const res = await api.voiceChat({ audioBlob });
      const transcript = res.data.transcript || 'Voice Question';
      const reply = res.data.reply || 'I processed your financial query.';

      const userMsgId = `user-voice-${Date.now()}`;
      const aiMsgId = `ai-voice-${Date.now()}`;

      setMessages((m) => [
        ...m,
        { id: userMsgId, role: 'user', text: transcript, isVoice: true },
        {
          id: aiMsgId,
          role: 'ai',
          text: reply,
          audioBase64: res.data.audioBase64,
          ttsEngine: res.data.ttsEngine,
        },
      ]);

      if (voiceEnabled) {
        playAssistantSpeech(aiMsgId, reply, res.data.audioBase64);
      }
    } catch (err: any) {
      console.error('Voice processing error:', err);
      const msg = err?.response?.data?.error || 'Unable to transcribe voice audio. Please try again or type.';
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'ai', text: msg }]);
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle CrediMerge Voice AI Assistant"
        className="fixed bottom-6 right-6 z-50 group"
        title="CrediMerge ElevenLabs Voice Assistant"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl animate-pulse" />

        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/50 bg-[#07100b]/95 text-emerald-400 shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-300 group-hover:bg-emerald-400 group-hover:text-black">
          {open ? (
            <span className="text-xl font-bold">✕</span>
          ) : (
            <span className="flex flex-col items-center">
              <span className="text-base leading-none">🎙️</span>
              <span className="text-[9px] font-mono font-bold mt-0.5">AI</span>
            </span>
          )}
        </span>
      </button>

      {/* AI Voice Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="ElevenLabs Voice Financial Assistant"
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[440px] max-w-[calc(100vw-2rem)] h-[580px] flex flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070a0c]/98 backdrop-blur-2xl shadow-2xl text-slate-100"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.08] bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-base">
                🎙️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">CrediMerge AI</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ELEVENLABS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Voice-Enabled Financial Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice toggle */}
              <button
                type="button"
                onClick={() => {
                  if (activeAudioId) stopCurrentAudio();
                  setVoiceEnabled(!voiceEnabled);
                }}
                className={`p-1.5 rounded-lg border text-xs transition ${
                  voiceEnabled
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'border-white/10 text-slate-500 bg-white/5'
                }`}
                title={voiceEnabled ? 'Voice Responses Enabled' : 'Voice Responses Muted'}
                aria-label={voiceEnabled ? 'Mute voice responses' : 'Unmute voice responses'}
              >
                {voiceEnabled ? '🔊' : '🔇'}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant panel"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {m.role === 'user' && m.isVoice && (
                  <span className="text-[9px] font-mono text-emerald-400/80 mb-1 flex items-center gap-1">
                    <span>🎙️</span> Voice Query
                  </span>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-400 text-black font-medium'
                      : 'border border-white/10 bg-white/[0.03] text-slate-200'
                  }`}
                >
                  {m.text}
                </div>

                {/* Audio Replay / Stop Control on Assistant Messages */}
                {m.role === 'ai' && m.id !== 'msg-welcome' && (
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    {activeAudioId === m.id ? (
                      <button
                        onClick={stopCurrentAudio}
                        className="inline-flex items-center gap-1.5 text-amber-400 hover:underline font-mono"
                      >
                        <span className="animate-pulse">⏹</span> Stop Speech
                      </button>
                    ) : (
                      <button
                        onClick={() => playAssistantSpeech(m.id, m.text, m.audioBase64)}
                        className="inline-flex items-center gap-1 text-emerald-400/80 hover:text-emerald-300 font-mono hover:underline"
                        title="Replay generated voice audio"
                      >
                        <span>▶</span> Replay Voice
                      </button>
                    )}

                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500 text-[9px] font-mono">
                      {m.ttsEngine === 'elevenlabs' ? 'ElevenLabs Audio' : 'Natural Voice'}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Active Status Indicator */}
            {statusText && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span>{statusText}</span>
              </div>
            )}

            {/* Speaking animation indicator */}
            {activeAudioId && !statusText && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-300 text-[11px] font-mono">
                <span className="animate-pulse">🔊</span>
                <span>Speaking answer...</span>
                <button
                  onClick={stopCurrentAudio}
                  className="ml-auto text-[10px] text-slate-400 hover:text-white underline"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Microphone / Permission Error Banner */}
            {micError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Notice
                </div>
                <div className="text-[11px] leading-relaxed">{micError}</div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Voice & Text Input Section */}
          <div className="p-4 border-t border-white/[0.08] bg-black/40 space-y-3">
            {/* Live Recording Active Visualizer */}
            {isRecording ? (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between text-rose-300">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                  </span>
                  <div>
                    <div className="text-xs font-bold tracking-wider uppercase font-mono">
                      Listening to speech...
                    </div>
                    <div className="text-[10px] font-mono text-rose-200">
                      Duration: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-600 transition shadow-lg flex items-center gap-1.5"
                >
                  <span>⏹</span> Done & Send
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendText();
                }}
                className="flex items-center gap-2"
              >
                {/* Microphone Button */}
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading}
                  aria-label="Start voice recording with ElevenLabs"
                  title="Click to speak your question"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all duration-300 disabled:opacity-40"
                >
                  <span className="text-lg">🎙️</span>
                </button>

                {/* Text input for text fallback */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={loading ? 'Processing...' : 'Ask question or tap mic...'}
                  disabled={loading}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send text message"
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 transition disabled:opacity-30 disabled:hover:bg-emerald-400"
                >
                  Send
                </button>
              </form>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ElevenLabs Scribe STT
              </span>
              <span>Tap 🎙️ to Speak</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}