'use client';

/**
 * components/onboarding/VoiceInterview.tsx  (v4 — Immersive Neon UI)
 *
 * Immersive, full-bleed Voice UI mirroring the Dribbble neon aesthetic.
 * Black minimalist layout, centered elegant typography, enormous layered 
 * waveform visualizer, and floating bottom controls.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Type, AlertTriangle } from 'lucide-react';
import { WaveformVisualizer } from './WaveformVisualizer';
import { DimensionOrbs }      from './DimensionOrbs';
import { ProfileReveal }      from './ProfileReveal';

type Phase = 'intro' | 'mic_check' | 'interview' | 'complete';

interface AnswerResponse {
  done:               boolean;
  next_question?:     string;
  current_dimension?: string;
  dimension_scores:   Record<string, number>;
  question_count:     number;
  conflict_flagged?:  boolean;
  user_context?:      Record<string, unknown>;
}

interface Props {
  userId:        string;
  isRetake?:     boolean;
  priorProfile?: Record<string, unknown> | null;
}

const SILENCE_THRESHOLD   = 0.01;
const SILENCE_DURATION_MS = 2500;
const BACKEND             = '/api/v1';

export function VoiceInterview({ userId, isRetake = false, priorProfile = null }: Props) {
  // Session
  const [sessionId,       setSessionId]       = useState('');
  const [phase,           setPhase]           = useState<Phase>('intro');

  // Interview
  const [question,        setQuestion]        = useState('');
  const [dimension,       setDimension]       = useState('');
  const [dimScores,       setDimScores]       = useState<Record<string, number>>({});
  const [questionCount,   setQuestionCount]   = useState(0);
  const [conflictFlagged, setConflictFlagged] = useState(false);
  const [userContext,     setUserContext]      = useState<Record<string, unknown> | null>(null);

  // Recording
  const [isRecording,   setIsRecording]   = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isSending,     setIsSending]     = useState(false);
  const [stream,        setStream]        = useState<MediaStream | null>(null);
  const [audioLevel,    setAudioLevel]    = useState(0);

  // Text mode
  const [textMode,   setTextMode]   = useState(false);
  const [textAnswer, setTextAnswer] = useState('');

  // AI typewriter
  const [aiTyping,      setAiTyping]      = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [aiAudioLevel,  setAiAudioLevel]  = useState(0);

  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const silenceCheckRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const ampRafRef         = useRef<number>(0);
  const aiAudioRef        = useRef<HTMLAudioElement | null>(null);

  // Mock AI audio level
  const startAIMockAmp = useCallback(() => {
    let t = 0;
    const tick = () => {
      t += 0.08;
      setAiAudioLevel(Math.abs(Math.sin(t * 3.7) * 0.6 + Math.sin(t * 1.2) * 0.4));
      ampRafRef.current = requestAnimationFrame(tick);
    };
    ampRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ampRafRef.current);
  }, []);

  /** Speak `text` — ElevenLabs first, browser SpeechSynthesis as fallback */
  const speakWithFallback = useCallback((text: string): (() => void) => {
    // Cancel any previous utterance
    window.speechSynthesis?.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.92;
    utter.pitch = 1.05;
    utter.volume = 1;

    // Prefer a high-quality English female voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /female|zira|samantha|karen|moira|tessa|fiona|victoria/i.test(v.name) &&
      v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en-GB')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    window.speechSynthesis.speak(utter);
    return () => window.speechSynthesis?.cancel();
  }, []);

  const typeQuestion = useCallback(async (text: string) => {
    // 1) Trigger backend TTS — fall back to browser SpeechSynthesis on any failure
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }

    let ttsSucceeded = false;
    try {
      const res = await fetch(`${BACKEND}/risk/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: 'laIfd2zdo5aIukjt406E' })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        aiAudioRef.current = audio;
        audio.play().catch(() => { /* ignore autoplay block */ });
        ttsSucceeded = true;
      }
    } catch {
      // network error — fall through to browser TTS
    }

    if (!ttsSucceeded && typeof window !== 'undefined' && window.speechSynthesis) {
      speakWithFallback(text);
    }

    setStreamingText('');
    setAiTyping(true);
    const stopAmp = startAIMockAmp();
    
    // 2) Sync visual typing (~45ms matches average speech phrasing)
    let idx = 0;
    await new Promise<void>(resolve => {
      const iv = setInterval(() => {
        idx++;
        setStreamingText(text.slice(0, idx));
        if (idx >= text.length) { clearInterval(iv); resolve(); }
      }, 45); 
    });
    
    stopAmp();
    cancelAnimationFrame(ampRafRef.current);
    setAiTyping(false);
    setAiAudioLevel(0);
    setQuestion(text);
    setStreamingText('');
  }, [startAIMockAmp, speakWithFallback]);

  const startSession = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/risk/session/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.skip) { window.location.href = '/dashboard'; return; }
      setSessionId(data.session_id);
      setDimension(data.current_dimension ?? '');
      setDimScores(data.dimension_scores   ?? {});
      setQuestionCount(data.question_count ?? 0);
      await typeQuestion(data.first_question ?? '');
    } catch {
      setError('Failed to connect. Please check the backend is running.');
    }
  }, [userId, typeQuestion]);

  const startAudioLevelPoll = useCallback((analyser: AnalyserNode) => {
    const buf = new Float32Array(analyser.fftSize);
    const poll = () => {
      analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      setAudioLevel(Math.min(rms * 8, 1));
      ampRafRef.current = requestAnimationFrame(poll);
    };
    poll();
  }, []);

  const requestMic = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s); setPhase('interview');
      await startSession();
    } catch {
      setError('Microphone denied. Use text mode instead.');
    }
  }, [startSession]);

  const startSilenceDetection = useCallback((ms: MediaStream) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx      = audioCtxRef.current;
    const source   = ctx.createMediaStreamSource(ms);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    startAudioLevelPoll(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let silent = 0;
    silenceCheckRef.current = setInterval(() => {
      analyserRef.current?.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      if (rms < SILENCE_THRESHOLD) { silent += 100; if (silent >= SILENCE_DURATION_MS) { silent = 0; stopAndSubmit(); } }
      else silent = 0;
    }, 100);
  }, [startAudioLevelPoll]); // eslint-disable-line

  const startRecording = useCallback(() => {
    if (!stream || isRecording || isSending) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setIsRecording(true); setRecordSeconds(0);
    timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    startSilenceDetection(stream);
  }, [stream, isRecording, isSending, startSilenceDetection]);

  const stopAndSubmit = useCallback(() => {
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    if (timerRef.current)        clearInterval(timerRef.current);
    cancelAnimationFrame(ampRafRef.current);
    setAudioLevel(0);
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await submitAnswer(blob, null);
    };
    mr.stop(); setIsRecording(false);
  }, []); // eslint-disable-line

  const submitAnswer = useCallback(async (audioBlob: Blob | null, textOverride: string | null) => {
    if (!sessionId || isSending) return;
    setIsSending(true); setError(null);
    try {
      const form = new FormData();
      if (audioBlob) {
        form.append('audio', audioBlob, 'answer.webm');
      } else {
        form.append('audio', new Blob([new Uint8Array(100)], { type: 'audio/webm' }), 'answer.webm');
        form.append('transcript_override', textOverride ?? '');
      }
      const res  = await fetch(`${BACKEND}/risk/session/${sessionId}/answer`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: AnswerResponse = await res.json();
      setDimScores(data.dimension_scores); setQuestionCount(data.question_count);
      setConflictFlagged(data.conflict_flagged ?? false);
      if (data.done && data.user_context) {
        setUserContext(data.user_context as Record<string, unknown>); setPhase('complete');
      } else {
        setDimension(data.current_dimension ?? ''); setTextAnswer('');
        await typeQuestion(data.next_question ?? '');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally { setIsSending(false); }
  }, [sessionId, isSending, typeQuestion]);

  const submitText = useCallback(() => {
    if (!textAnswer.trim()) return;
    submitAnswer(null, textAnswer.trim());
  }, [textAnswer, submitAnswer]);

  useEffect(() => () => {
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
    }
    window.speechSynthesis?.cancel();
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    if (timerRef.current)        clearInterval(timerRef.current);
    cancelAnimationFrame(ampRafRef.current);
    audioCtxRef.current?.close();
    stream?.getTracks().forEach(t => t.stop());
  }, [stream]);

  if (phase === 'complete' && userContext) {
    return (
      <ProfileReveal
        userContext={userContext as Parameters<typeof ProfileReveal>[0]['userContext']}
        onContinue={() => { window.location.href = '/dashboard'; }}
      />
    );
  }

  // ── Layout Wrapper ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '5vh 5vw' }}>
      
      {/* ── Intro & Mic Check ── */}
      <AnimatePresence mode="wait">
        {(phase === 'intro' || phase === 'mic_check') && (
          <motion.div 
            key={phase}
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ 
              flex: 1, display: 'flex', flexDirection: 'column', 
              alignItems: 'center', justifyContent: 'center', textAlign: 'center'
            }}
          >
            {/* Ambient Waveform Preview */}
            <div style={{ width: '100%', maxWidth: '800px', marginBottom: '40px', opacity: 0.5 }}>
              <WaveformVisualizer stream={null} isRecording={false} />
            </div>

            <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '16px' }}>
              {phase === 'intro' ? (isRetake ? 'Quick Profile Update' : 'Initialize Voice Assistant.') : 'Microphone Check.'}
            </h1>
            
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', maxWidth: '480px', lineHeight: 1.6, marginBottom: '48px' }}>
              {phase === 'intro' ? 
                'Speak naturally. I will adapt to your responses and build a personalized risk profile in real-time.' : 
                'Please click "Allow" when the browser prompts for microphone access.'}
            </p>

            {error && <ErrCard msg={error} style={{ marginBottom: '24px' }} />}

            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={phase === 'intro' ? () => setPhase('mic_check') : requestMic}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', borderRadius: '30px', padding: '16px 36px', fontSize: '16px', fontWeight: 600,
                  cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s', display: 'flex', gap: '10px'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <Mic size={18} /> {phase === 'intro' ? 'Start voice interview' : 'Allow access'}
              </button>
              
              <button
                onClick={() => { setTextMode(true); setPhase('interview'); phase === 'mic_check' ? startSession() : requestMic(); }}
                style={{
                  background: 'transparent', border: '1px solid transparent',
                  color: 'rgba(255,255,255,0.4)', borderRadius: '30px', padding: '16px 24px', fontSize: '15px',
                  cursor: 'pointer', transition: 'color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                Use text mode
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Immersive Interview Layout ── */}
        {phase === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* Top HUD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
               <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
                  <span style={{ color: '#00F2FE' }}>Invex</span> / Risk Profiler
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {dimension && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dimension.replace('_', ' ')}</span>}
                  {conflictFlagged && <span style={{ color: '#FF0844', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(255,8,68,0.3)', padding: '4px 10px', borderRadius: '4px' }}>Clarifying</span>}
                  <DimensionOrbs scores={dimScores} />
               </div>
            </div>

            {/* Center Area: Text + Enormous Waveform */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              
              <div style={{ maxWidth: '800px', textAlign: 'center', marginBottom: '60px', minHeight: '80px' }}>
                <AnimatePresence mode="wait">
                  {isSending ? (
                    <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', justifyItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>Processing input...</span>
                    </motion.div>
                  ) : aiTyping ? (
                    <motion.p key="stream" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '32px', color: '#fff', fontWeight: 400, lineHeight: 1.4, margin: 0 }}>
                      {streamingText}
                      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ display: 'inline-block', width: '3px', height: '0.8em', background: '#00F2FE', marginLeft: '6px' }} />
                    </motion.p>
                  ) : (
                    <motion.p key="q" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '32px', color: '#fff', fontWeight: 400, lineHeight: 1.4, margin: 0 }}>
                      {question || 'Initializing...'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Immersive Waveform spanning wide */}
              <div style={{ width: '100%', maxWidth: '1200px' }}>
                 <WaveformVisualizer 
                   stream={stream} 
                   isRecording={isRecording} 
                   aiSpeaking={aiTyping} 
                   audioLevel={aiTyping ? aiAudioLevel : audioLevel} 
                 />
              </div>

            </div>

            {/* Bottom Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2vh' }}>
              {!textMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  
                  {isRecording && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF0844' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>00:0{recordSeconds}s</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      onClick={() => setTextMode(true)}
                      style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      <Type size={18} />
                    </button>

                    <button 
                      onClick={isRecording ? stopAndSubmit : startRecording}
                      disabled={!isRecording && (isSending || aiTyping || !question)}
                      style={{ 
                        width: '80px', height: '80px', borderRadius: '50%', 
                        background: isRecording ? '#FF0844' : (isSending || aiTyping || !question) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)', 
                        border: '1px solid', borderColor: isRecording ? '#FF0844' : 'rgba(255,255,255,0.2)',
                        color: isRecording ? '#fff' : (isSending || aiTyping || !question) ? 'rgba(255,255,255,0.2)' : '#fff', 
                        cursor: (isSending || aiTyping || !question) && !isRecording ? 'not-allowed' : 'pointer', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'all 0.3s',
                        boxShadow: isRecording ? '0 0 30px rgba(255,8,68,0.4)' : 'none'
                      }}
                      onMouseOver={e => { if (!isRecording && !(isSending || aiTyping || !question)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                      onMouseOut={e => { if (!isRecording && !(isSending || aiTyping || !question)) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                    >
                      {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    <div style={{ width: '60px' }} /> {/* Spacer for symmetry */}
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitText(); }}
                      placeholder="Type your response... (Ctrl+Enter to send)"
                      rows={1}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '30px', padding: '16px 64px 16px 24px', color: '#fff', fontSize: '15px', resize: 'none', outline: 'none', backdropFilter: 'blur(10px)' }}
                    />
                    <button 
                      onClick={submitText}
                      disabled={!textAnswer.trim() || isSending}
                      style={{ position: 'absolute', right: '8px', top: '8px', bottom: '8px', width: '40px', borderRadius: '50%', background: textAnswer.trim() ? '#00F2FE' : 'transparent', color: textAnswer.trim() ? '#000' : 'rgba(255,255,255,0.2)', border: 'none', cursor: textAnswer.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <button onClick={() => setTextMode(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', alignSelf: 'center' }}>
                    Return to voice
                  </button>
                </div>
              )}
            </div>

            {error && <ErrCard msg={error} style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)' }} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrCard({ msg, style: s }: { msg: string; style?: React.CSSProperties }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'center', backdropFilter: 'blur(10px)', ...s }}>
      <AlertTriangle size={16} color="#EF4444" />
      <span style={{ fontSize: '14px', color: '#FCA5A5' }}>{msg}</span>
    </motion.div>
  );
}
