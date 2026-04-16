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

type Phase = 'intro' | 'mic_check' | 'interview' | 'complete';

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
  const [isSending,       setIsSending]       = useState(false);
  const [stream,          setStream]          = useState<MediaStream | null>(null);
  const [audioLevel,      setAudioLevel]      = useState(0);
  const [isRecording,     setIsRecording]     = useState(false);
  
  // AI State
  const [aiTyping,        setAiTyping]        = useState(false);
  const [aiAudioLevel,    setAiAudioLevel]    = useState(0);
  
  // Text mode fallback
  const [textMode,        setTextMode]        = useState(false);
  const [textAnswer,      setTextAnswer]      = useState('');

  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const silenceCheckRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const ampRafRef         = useRef<number>(0);
  const aiAudioRef        = useRef<HTMLAudioElement | null>(null);

  // Mock AI audio level for waveform
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

  /**
   * Speak text: tries /risk/tts (Murf) first, falls back to browser SpeechSynthesis.
   * Drives the waveform animation while audio plays.
   */
  const speakText = useCallback(async (text: string) => {
    // Stop any previous audio
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setAiTyping(true);
    const stopAmp = startAIMockAmp();

    const finish = () => {
      stopAmp();
      cancelAnimationFrame(ampRafRef.current);
      setAiTyping(false);
      setAiAudioLevel(0);
    };

    // Try Murf via backend /tts
    try {
      const res = await fetch(`${BACKEND}/risk/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          aiAudioRef.current = audio;
          audio.onended = finish;
          audio.onerror = () => {
            // Fall through to browser TTS on playback error
            finish();
            browserSpeak(text);
          };
          await audio.play();
          return; // success — exit early
        }
      }
    } catch {
      // Network / API error — fall through
    }

    // Browser SpeechSynthesis fallback
    browserSpeak(text, finish);
  }, [startAIMockAmp]); // eslint-disable-line

  function browserSpeak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.92;
    utter.pitch = 1.05;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /female|zira|samantha|karen|moira|tessa|fiona|victoria/i.test(v.name) && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en-GB')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;
    if (onEnd) utter.onend = onEnd;
    window.speechSynthesis.speak(utter);
  }

  const startSession = useCallback(async () => {
    setSessionId(userId + "_session");
  }, [userId]);

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
      setStream(s); 
      setPhase('interview');
      await startSession();
      const greeting = "Hello, let's start the risk profiling interview. What's your investment goal?";
      setQuestion(greeting);
      // Speak the greeting immediately
      speakText(greeting);
    } catch {
      setError('Microphone denied. Use text mode instead.');
    }
  }, [startSession, speakText]);

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
      if (rms < SILENCE_THRESHOLD) { 
          silent += 100; 
          if (silent >= SILENCE_DURATION_MS) { 
              silent = 0; 
              stopAndSubmit(); 
          } 
      }
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
    setIsRecording(true);
    startSilenceDetection(stream);
  }, [stream, isRecording, isSending, startSilenceDetection]);

  const stopAndSubmit = useCallback(() => {
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    cancelAnimationFrame(ampRafRef.current);
    setAudioLevel(0);
    
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await submitVoicePipeline(blob);
    };
    mr.stop(); 
    setIsRecording(false);
  }, []); // eslint-disable-line

  const submitVoicePipeline = useCallback(async (audioBlob: Blob) => {
    if (isSending) return;
    setIsSending(true); 
    setError(null);
    setAiTyping(true);
    
    try {
      const form = new FormData();
      form.append('audio', audioBlob, 'answer.webm');
      form.append('session_id', sessionId);
      
      const response = await fetch(`${BACKEND}/risk/voice`, {
        method: "POST",
        body: form
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      // Check content type: JSON (reply_text) or audio blob
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Backend returned JSON with reply_text
        const data = await response.json();
        const replyText = data.reply_text || data.text || '';
        if (replyText) {
          setQuestion(replyText);
          setAiTyping(false);
          await speakText(replyText);
        } else {
          setAiTyping(false);
        }
      } else {
        // Backend returned audio blob (Murf MP3)
        const audioResultBlob = await response.blob();
        setAiTyping(false); // speakText will re-set aiTyping
        
        if (audioResultBlob.size > 0) {
          const audioUrl = URL.createObjectURL(audioResultBlob);
          const audio = new Audio(audioUrl);
          aiAudioRef.current = audio;
          
          const stopAmp = startAIMockAmp();
          setAiTyping(true);
          
          audio.onended = () => {
            stopAmp();
            cancelAnimationFrame(ampRafRef.current);
            setAiTyping(false);
            setAiAudioLevel(0);
          };
          
          // Try to play; if autoplay blocked, fall back to browser TTS
          audio.play().catch(() => {
            stopAmp();
            setAiTyping(false);
            browserSpeak(question);
          });
        }
      }
      
    } catch (e: any) {
      setError(e.message || 'Failed to submit voice.');
      setAiTyping(false);
    } finally {
      setIsSending(false);
    }
  }, [sessionId, isSending, startAIMockAmp, speakText, question]);
  
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '5vh 5vw' }}>
      <AnimatePresence mode="wait">
        {(phase === 'intro') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              Voice Interview System
            </h1>
            <button 
              onClick={requestMic}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: '30px', padding: '16px 36px', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s', display: 'flex', gap: '10px'
              }}
            >
              <Mic size={18} /> Start Session
            </button>
            {error && <ErrCard msg={error} style={{ marginTop: '24px' }} />}
          </motion.div>
        )}

        {phase === 'interview' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* Center Area: Enormous Waveform */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              
              <div style={{ maxWidth: '800px', textAlign: 'center', marginBottom: '60px', minHeight: '80px' }}>
                <AnimatePresence mode="wait">
                  {isSending ? (
                     <motion.p style={{ fontSize: '32px', color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>Processing...</motion.p>
                  ) : aiTyping ? (
                     <motion.p style={{ fontSize: '32px', color: '#fff', fontWeight: 400 }}>Assistant is speaking...</motion.p>
                  ) : (
                     <motion.p style={{ fontSize: '32px', color: '#fff', fontWeight: 400 }}>{question}</motion.p>
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
                >
                  {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
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
    <motion.div 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'center', backdropFilter: 'blur(10px)', ...s }}>
      <AlertTriangle size={16} color="#EF4444" />
      <span style={{ fontSize: '14px', color: '#FCA5A5' }}>{msg}</span>
    </motion.div>
  );
}
