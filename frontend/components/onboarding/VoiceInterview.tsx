'use client';

/**
 * components/onboarding/VoiceInterview.tsx
 *
 * Voice Interview using browser Web Speech API (SpeechRecognition + SpeechSynthesis).
 * Calls /api/v1/risk/interview/turn for each Q&A turn.
 * When complete, POSTs the extracted profile to /api/v1/risk/profile/{userId}.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { WaveformVisualizer } from './WaveformVisualizer';

type Phase = 'intro' | 'interview' | 'saving' | 'complete' | 'error';

interface Props {
  userId:        string;
  isRetake?:     boolean;
  priorProfile?: Record<string, unknown> | null;
}

const BACKEND = '/api/v1';

// Browser Speech Recognition type shim
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceInterview({ userId, isRetake = false }: Props) {
  const [phase,       setPhase]       = useState<Phase>('intro');
  const [question,    setQuestion]    = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiSpeaking,  setAiSpeaking]  = useState(false);
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [turnCount,   setTurnCount]   = useState(0);
  const [stream,      setStream]      = useState<MediaStream | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const stateRef        = useRef<Record<string, unknown>>({});
  const recognitionRef  = useRef<any | null>(null);
  const ampRafRef       = useRef<number>(0);
  const transcriptRef   = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);

  // ── Audio level polling ──────────────────────────────────────────────────────
  const startLevelPoll = useCallback((ms: MediaStream) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const source = ctx.createMediaStreamSource(ms);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    const buf = new Float32Array(analyser.fftSize);
    const poll = () => {
      analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      setAudioLevel(Math.min(rms * 8, 1));
      ampRafRef.current = requestAnimationFrame(poll);
    };
    poll();
  }, []);

  // ── Browser TTS ──────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis?.cancel();
    setAiSpeaking(true);
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.92;
    utter.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /female|zira|samantha|karen|moira|tessa|fiona/i.test(v.name) && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en-GB')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;
    utter.onend = () => { setAiSpeaking(false); onEnd?.(); };
    utter.onerror = () => { setAiSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Submit one text turn to backend ─────────────────────────────────────────
  const submitTurn = useCallback(async (userText: string) => {
    try {
      const res = await fetch(`${BACKEND}/risk/interview/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_text:  userText,
          session_id: userId + '_session',
          state:      stateRef.current,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      stateRef.current = data.state || stateRef.current;
      setTurnCount(c => c + 1);

      if (data.is_complete && data.profile) {
        // Interview complete — save profile
        setPhase('saving');
        speak(data.reply);
        await saveProfile(data.profile);
      } else {
        setQuestion(data.reply || '');
        speak(data.reply || '');
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Something went wrong');
    }
  }, [userId, speak]); // eslint-disable-line

  // ── Save profile to backend ──────────────────────────────────────────────────
  const saveProfile = useCallback(async (profile: Record<string, unknown>) => {
    try {
      const res = await fetch(`${BACKEND}/risk/profile/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: stateRef.current?.answers || {}, ...profile }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setPhase('complete');
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to save profile');
      setPhase('error');
    }
  }, [userId]);

  // ── Start listening (SpeechRecognition) ──────────────────────────────────────
  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    clearTimeout(silenceTimerRef.current);
  }, []);

  const startListening = useCallback(() => {
    if (shouldListenRef.current) return;
    shouldListenRef.current = true;
    
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('SpeechRecognition not supported in this browser. Try Chrome.'); return; }

    try { recognitionRef.current?.stop(); } catch(e) {}

    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = false;
    recognitionRef.current = rec;

    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => {
      setIsListening(false);
      if (shouldListenRef.current) {
        try { rec.start(); } catch(e) {}
      }
    };
    rec.onerror  = (e: any) => { 
      if (e.error !== 'no-speech') {
        setIsListening(false);
        setError(`Mic error: ${e.error}`);
      }
    };
    rec.onresult = (e: any) => {
      let newlyFinal = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          newlyFinal += e.results[i][0].transcript + ' ';
        }
      }
      
      if (newlyFinal.trim()) {
        transcriptRef.current += newlyFinal;
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
           const finalAns = transcriptRef.current.trim();
           if (finalAns) {
              stopListening();
              submitTurn(finalAns);
              transcriptRef.current = '';
           }
        }, 2000);
      }
    };
    
    try { rec.start(); } catch(e) {}
  }, [submitTurn, stopListening]);

  useEffect(() => {
    if (phase === 'interview' && !aiSpeaking) {
      startListening();
    } else {
      stopListening();
    }
  }, [phase, aiSpeaking, startListening, stopListening]);

  // ── Start interview ──────────────────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    setError(null);
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(ms);
      startLevelPoll(ms);
      setPhase('interview');
      const opening = "Hello! I'm your Invex AI financial advisor. Let's build your personalised risk profile. What is your primary investment goal right now?";
      setQuestion(opening);
      stateRef.current = { currentQuestion: "What is your primary investment goal right now?" };
      speak(opening);
    } catch {
      setError('Microphone access denied. Please allow microphone and try again.');
    }
  }, [speak, startLevelPoll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(ampRafRef.current);
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  // ── Redirect on complete ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'complete') {
      setTimeout(() => { window.location.href = '/dashboard'; }, 3000);
    }
  }, [phase]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '5vh 5vw' }}>
      <AnimatePresence mode="wait">

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              {isRetake ? 'Retake Risk Interview' : 'Risk Profile Interview'}
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: '16px', maxWidth: '480px', marginBottom: '40px' }}>
              Answer 5–7 short questions via voice. Our AI will build your personalised risk profile in under 3 minutes.
            </p>
            <button
              onClick={startInterview}
              style={{
                background: '#C8F135', color: '#000', fontWeight: 700,
                borderRadius: '30px', padding: '16px 40px', fontSize: '16px',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
              }}
            >
              <Mic size={18} /> Start Interview
            </button>
            {error && <ErrCard msg={error} style={{ marginTop: '24px' }} />}
          </motion.div>
        )}

        {/* ── INTERVIEW ── */}
        {phase === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {/* Progress */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    width: '32px', height: '4px', borderRadius: '2px',
                    background: i < turnCount ? '#C8F135' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>

              {/* Question display */}
              <div style={{ maxWidth: '700px', textAlign: 'center', marginBottom: '48px', minHeight: '80px' }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={question}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ fontSize: '28px', color: aiSpeaking ? '#C8F135' : '#fff', fontWeight: 400, lineHeight: 1.4 }}
                  >
                    {aiSpeaking ? 'Speaking…' : question}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Waveform */}
              <div style={{ width: '100%', maxWidth: '900px' }}>
                <WaveformVisualizer stream={stream} isRecording={isListening} aiSpeaking={aiSpeaking} audioLevel={isListening ? audioLevel : (aiSpeaking ? 0.4 : 0)} />
              </div>
            </div>

            {/* Status indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2vh', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: isListening ? '#C8F135' : '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isListening ? <><Mic size={16} /> Listening... speak your answer</> : aiSpeaking ? 'AI speaking...' : 'Processing...'}
              </span>
            </div>
            {error && <ErrCard msg={error} style={{ textAlign: 'center', margin: '0 auto 16px' }} />}
          </motion.div>
        )}

        {/* ── SAVING ── */}
        {phase === 'saving' && (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#C8F135', filter: 'blur(12px)' }}
            />
            <p style={{ color: '#fff', fontSize: '20px', fontWeight: 500 }}>Building your risk profile…</p>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>This takes just a moment</p>
          </motion.div>
        )}

        {/* ── COMPLETE ── */}
        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', textAlign: 'center' }}
          >
            <CheckCircle size={56} color="#C8F135" />
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>Risk Profile Saved!</h2>
            <p style={{ color: '#9CA3AF', fontSize: '15px', maxWidth: '400px' }}>
              Your personalised risk profile is ready. Redirecting you to the dashboard…
            </p>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}
          >
            <ErrCard msg={error || 'Something went wrong'} />
            <button onClick={() => setPhase('intro')} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}>
              Try Again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function ErrCard({ msg, style: s }: { msg: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'center', backdropFilter: 'blur(10px)', ...s }}
    >
      <AlertTriangle size={16} color="#EF4444" />
      <span style={{ fontSize: '14px', color: '#FCA5A5' }}>{msg}</span>
    </motion.div>
  );
}
