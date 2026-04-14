'use client';

/**
 * components/onboarding/VoiceInterview.tsx  (v3 — Light Glass UI)
 *
 * Interview logic unchanged. Visual system fully switched to light theme
 * matching the crystal glass reference: dark purple text on white/lavender glass.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Type, AlertTriangle, ArrowRight } from 'lucide-react';
import { WaveformVisualizer } from './WaveformVisualizer';
import { DimensionOrbs }      from './DimensionOrbs';
import { ProfileReveal }      from './ProfileReveal';

// ── Types ─────────────────────────────────────────────────────────────────────
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

// Shared styles for light theme
const pill: React.CSSProperties = {
  background: 'rgba(120,85,210,0.08)',
  border:     '1px solid rgba(120,85,210,0.18)',
  borderRadius: '999px',
  padding:    '3px 12px',
  fontSize:   '11px',
  fontWeight: 600,
  color:      '#6B4FC0',
  letterSpacing: '0.05em',
};

const glassInner: React.CSSProperties = {
  background:  'rgba(255,255,255,0.45)',
  border:      '1px solid rgba(255,255,255,0.80)',
  borderRadius: '18px',
  padding:     '16px 18px',
  backdropFilter: 'blur(12px)',
};

// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Mock AI audio level ──────────────────────────────────────────────────
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

  // ── Typewriter ───────────────────────────────────────────────────────────
  const typeQuestion = useCallback(async (text: string) => {
    setStreamingText('');
    setAiTyping(true);
    const stopAmp = startAIMockAmp();
    let idx = 0;
    await new Promise<void>(resolve => {
      const iv = setInterval(() => {
        idx++;
        setStreamingText(text.slice(0, idx));
        if (idx >= text.length) { clearInterval(iv); resolve(); }
      }, 20);
    });
    stopAmp();
    cancelAnimationFrame(ampRafRef.current);
    setAiTyping(false);
    setAiAudioLevel(0);
    setQuestion(text);
    setStreamingText('');
  }, [startAIMockAmp]);

  // ── Session ──────────────────────────────────────────────────────────────
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

  // ── Mic ──────────────────────────────────────────────────────────────────
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

  // ── Silence detection ────────────────────────────────────────────────────
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

  // ── Recording ────────────────────────────────────────────────────────────
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

  // ── Submit ───────────────────────────────────────────────────────────────
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
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    if (timerRef.current)        clearInterval(timerRef.current);
    cancelAnimationFrame(ampRafRef.current);
    audioCtxRef.current?.close();
    stream?.getTracks().forEach(t => t.stop());
  }, [stream]);

  // ── Render: complete ─────────────────────────────────────────────────────
  if (phase === 'complete' && userContext) {
    return (
      <ProfileReveal
        userContext={userContext as Parameters<typeof ProfileReveal>[0]['userContext']}
        onContinue={() => { window.location.href = '/dashboard'; }}
      />
    );
  }

  const completedDims = Object.values(dimScores).filter(s => s >= 80).length;
  const totalDims     = Object.keys(dimScores).length || 6;
  const progressPct   = Math.round((completedDims / totalDims) * 100);

  // ── Phase: INTRO ─────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {isRetake && priorProfile && (
        <div style={{ ...glassInner, marginBottom: '16px', background: 'rgba(120,85,210,0.06)', borderColor: 'rgba(120,85,210,0.15)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B4FC0' }}>
            👋 Welcome back! Last score: <strong>{(priorProfile.risk_score as number)?.toFixed(0)}/100</strong>
            {' '}({String(priorProfile.risk_label).replace(/_/g, ' ')})
          </p>
        </div>
      )}

      <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#2D1F5E', lineHeight: 1.25, margin: '0 0 8px' }}>
        {isRetake ? 'Quick Profile Update' : "Let's build your risk profile"}
      </h1>
      <p style={{ color: 'rgba(60,40,120,0.50)', fontSize: '14px', lineHeight: 1.65, margin: '0 0 20px' }}>
        {isRetake
          ? 'A few targeted questions to refresh your profile — 2–3 minutes.'
          : '8–12 voice questions. Your AI advisor will listen and build a personalized risk profile.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '22px' }}>
        {[
          ['🎙️', 'Speak naturally — no right or wrong answers'],
          ['🧠', 'Questions adapt based on what you say'],
          ['🔒', 'Voice stays private, processed on-device'],
        ].map(([icon, text]) => (
          <div key={text as string} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '15px' }}>{icon}</span>
            <span style={{ fontSize: '13px', color: 'rgba(60,40,120,0.55)' }}>{text}</span>
          </div>
        ))}
      </div>

      <PrimaryBtn onClick={() => setPhase('mic_check')}><Mic size={15} /> Start Voice Interview</PrimaryBtn>
      <GhostBtn onClick={() => { setTextMode(true); setPhase('mic_check'); requestMic(); }}>
        Prefer typing instead →
      </GhostBtn>
    </motion.div>
  );

  // ── Phase: MIC CHECK ─────────────────────────────────────────────────────
  if (phase === 'mic_check') return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
      {/* Mic pulse icon */}
      <div style={{ position: 'relative', width: '72px', height: '72px', margin: '8px auto 20px' }}>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(120,85,210,0.15)' }}
        />
        <div style={{
          position: 'absolute', inset: '10px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #9B7FE0, #6B4FC0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(120,85,210,0.30)',
        }}>
          <Mic size={22} color="white" />
        </div>
      </div>

      <h2 style={{ fontSize: '21px', fontWeight: 700, color: '#2D1F5E', marginBottom: '8px' }}>
        Allow Microphone Access
      </h2>
      <p style={{ color: 'rgba(60,40,120,0.50)', fontSize: '13px', lineHeight: 1.65, marginBottom: '24px' }}>
        Your browser will ask for permission. Click "Allow" to continue.
      </p>

      {error && <ErrCard msg={error} />}

      <PrimaryBtn onClick={requestMic}><Mic size={15} /> Allow & Start</PrimaryBtn>
      <GhostBtn onClick={() => { setTextMode(true); setPhase('interview'); startSession(); }}>Use text mode</GhostBtn>
    </motion.div>
  );

  // ── Phase: INTERVIEW ─────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Progress header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(60,40,120,0.45)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          Q{questionCount + 1} · {completedDims}/{totalDims} dimensions
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {dimension && <span style={pill}>{dimension.replace(/_/g, ' ')}</span>}
          {conflictFlagged && <span style={{ ...pill, background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.25)', color: '#B45309' }}>⚠ Clarifying</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(120,85,210,0.10)', borderRadius: '999px', marginBottom: '16px', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #9B7FE0, #6B4FC0)', borderRadius: '999px' }}
        />
      </div>

      {/* Dimension orbs */}
      <DimensionOrbs scores={dimScores} />

      {/* Question card */}
      <motion.div layout style={{ ...glassInner, minHeight: '80px', display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
        <AnimatePresence mode="wait">
          {isSending ? (
            <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ThinkingDots />
              <span style={{ fontSize: '13px', color: 'rgba(60,40,120,0.45)' }}>Processing…</span>
            </motion.div>
          ) : aiTyping ? (
            <motion.p key="stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontSize: '15px', color: '#2D1F5E', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
              {streamingText}
              <motion.span
                animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                style={{ display: 'inline-block', width: '2px', height: '1em', background: '#8B6FD4', borderRadius: '1px', marginLeft: '3px', verticalAlign: 'middle' }}
              />
            </motion.p>
          ) : (
            <motion.p key="q" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: '15px', color: '#2D1F5E', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
              {question || 'Loading…'}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Waveform */}
      <div style={{ marginBottom: '12px' }}>
        <WaveformVisualizer stream={stream} isRecording={isRecording} aiSpeaking={aiTyping} audioLevel={aiTyping ? aiAudioLevel : audioLevel} />
      </div>

      {/* Controls */}
      {!textMode ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '22px', marginBottom: '10px' }}>
            {isRecording && (
              <>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', marginRight: '7px' }} />
                <span style={{ fontSize: '12px', color: 'rgba(60,40,120,0.50)' }}>{recordSeconds}s · silence auto-submits</span>
              </>
            )}
            {!isRecording && !isSending && !aiTyping && question && (
              <span style={{ fontSize: '12px', color: 'rgba(60,40,120,0.35)' }}>Press record to answer</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!isRecording ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={startRecording}
                disabled={isSending || aiTyping || !question}
                style={{
                  flex: 1,
                  background: (isSending || aiTyping || !question) ? 'rgba(120,85,210,0.18)' : 'linear-gradient(135deg, #9B7FE0, #6B4FC0)',
                  color: (isSending || aiTyping || !question) ? 'rgba(60,40,120,0.45)' : '#fff',
                  fontWeight: 700, fontSize: '14px', border: 'none',
                  borderRadius: '14px', padding: '13px',
                  cursor: (isSending || aiTyping || !question) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  boxShadow: '0 4px 18px rgba(120,85,210,0.25)',
                }}>
                <Mic size={15} /> Record Answer
              </motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={stopAndSubmit}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff',
                  fontWeight: 700, fontSize: '14px', border: 'none',
                  borderRadius: '14px', padding: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.25)',
                }}>
                <MicOff size={15} /> Stop & Submit
              </motion.button>
            )}

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setTextMode(true)}
              style={{
                background: 'rgba(120,85,210,0.08)', border: '1px solid rgba(120,85,210,0.18)',
                borderRadius: '14px', padding: '13px 15px', cursor: 'pointer', color: 'rgba(60,40,120,0.50)',
              }}>
              <Type size={15} />
            </motion.button>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <textarea
            value={textAnswer}
            onChange={e => setTextAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitText(); }}
            placeholder="Type your answer… (Ctrl+Enter to submit)"
            rows={4}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(120,85,210,0.20)',
              borderRadius: '14px', padding: '13px 15px',
              color: '#2D1F5E', fontSize: '14px', resize: 'none', outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6,
            }}
            onFocus={e  => { e.target.style.borderColor = 'rgba(120,85,210,0.45)'; }}
            onBlur={e   => { e.target.style.borderColor = 'rgba(120,85,210,0.20)'; }}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={() => setTextMode(false)} style={{
              background: 'rgba(120,85,210,0.08)', border: '1px solid rgba(120,85,210,0.18)',
              borderRadius: '12px', padding: '11px 16px', cursor: 'pointer',
              color: 'rgba(60,40,120,0.55)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
            }}>
              <Mic size={14} /> Voice
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={submitText}
              disabled={!textAnswer.trim() || isSending}
              style={{
                flex: 1,
                background: textAnswer.trim() ? 'linear-gradient(135deg, #9B7FE0, #6B4FC0)' : 'rgba(120,85,210,0.18)',
                color: textAnswer.trim() ? '#fff' : 'rgba(60,40,120,0.45)',
                fontWeight: 700, fontSize: '14px', border: 'none',
                borderRadius: '12px', padding: '11px',
                cursor: textAnswer.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: textAnswer.trim() ? '0 4px 16px rgba(120,85,210,0.25)' : 'none',
              }}>
              <Send size={14} /> Submit
            </motion.button>
          </div>
        </motion.div>
      )}

      {error && <ErrCard msg={error} style={{ marginTop: '14px' }} />}

      <div style={{ textAlign: 'center', marginTop: '14px' }}>
        <button
          onClick={async () => {
            if (sessionId) {
              const res = await fetch(`${BACKEND}/risk/session/${sessionId}/finish`, { method: 'POST' });
              const d   = await res.json();
              if (d.user_context) { setUserContext(d.user_context); setPhase('complete'); }
            }
          }}
          style={{ background: 'none', border: 'none', color: 'rgba(60,40,120,0.28)', fontSize: '11px', cursor: 'pointer' }}>
          Skip for now →
        </button>
      </div>
    </motion.div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(120,85,210,0.35)' }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #9B7FE0 0%, #6B4FC0 100%)',
        color: '#fff', fontWeight: 700, fontSize: '15px',
        border: 'none', borderRadius: '16px', padding: '15px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        boxShadow: '0 4px 20px rgba(120,85,210,0.30)',
        letterSpacing: '-0.01em',
      }}>
      {children}
    </motion.button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: 'none', border: 'none',
      color: 'rgba(60,40,120,0.40)', fontSize: '13px',
      marginTop: '11px', cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

function ErrCard({ msg, style: s }: { msg: string; style?: React.CSSProperties }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)',
        borderRadius: '14px', padding: '12px 16px',
        display: 'flex', gap: '8px', alignItems: 'flex-start', ...s,
      }}>
      <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
      <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{msg}</p>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B6FD4' }}
        />
      ))}
    </div>
  );
}
