'use client';

/**
 * components/onboarding/WaveformVisualizer.tsx (v4 — Neon Siri-style)
 *
 * Implements the immersive Dribbble neon wave design.
 * Uses 3-4 overlapping sine waves with different frequencies, phases, and 
 * neon gradient strokes. Includes a reflection layer below.
 */

import { useEffect, useRef } from 'react';

type VisMode = 'idle' | 'recording' | 'processing' | 'ai_speaking';

interface Props {
  stream: MediaStream | null;
  isRecording: boolean;
  aiSpeaking?: boolean;
  audioLevel?: number; // 0-1
}

const WAVES = [
  { color: '#00F2FE', speed: 1.5, freq: 0.005, ampMulti: 1.0, phaseOffset: 0 },
  { color: '#4FACFE', speed: 1.8, freq: 0.007, ampMulti: 0.8, phaseOffset: 2 },
  { color: '#FF0844', speed: 1.2, freq: 0.004, ampMulti: 1.2, phaseOffset: 4 },
  { color: '#8A2387', speed: 1.0, freq: 0.006, ampMulti: 0.9, phaseOffset: 1 },
];

export function WaveformVisualizer({ stream, isRecording, aiSpeaking = false, audioLevel = 0 }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const frameRef    = useRef<number>(0);
  const timeRef     = useRef<number>(0);
  const modeRef     = useRef<VisMode>('idle');
  const ampRef      = useRef<number>(audioLevel);
  const smoothAmp   = useRef<number>(0);

  // For real mic data
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => { ampRef.current = audioLevel; }, [audioLevel]);

  useEffect(() => {
    if      (isRecording)  modeRef.current = 'recording';
    else if (aiSpeaking)   modeRef.current = 'ai_speaking';
    else                   modeRef.current = 'idle';
  }, [isRecording, aiSpeaking]);

  // Mic setup
  useEffect(() => {
    if (!stream || !isRecording) {
      analyserRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    return () => {
      analyser.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream, isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raw = canvas.getContext('2d');
    if (!raw) return;
    const ctx = raw as CanvasRenderingContext2D;

    const DPR = window.devicePixelRatio || 1;
    // We'll give it a wide ratio
    canvas.width  = canvas.offsetWidth * DPR;
    canvas.height = canvas.offsetHeight * DPR;
    ctx.scale(DPR, DPR);

    function render(ts: number) {
      timeRef.current = ts / 1000;
      const t = timeRef.current;
      const mode = modeRef.current;
      
      const W = canvas!.offsetWidth;
      const H = canvas!.offsetHeight;
      const centerY = H * 0.45; // slightly above center so reflection fits

      ctx.clearRect(0, 0, W, H);

      // Determine target amplitude
      let targetAmp = 0.05; // base idle amp
      if (mode === 'recording' && analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        targetAmp = 0.05 + (avg / 255) * 0.8;
      } else if (mode === 'ai_speaking') {
        targetAmp = 0.1 + ampRef.current * 0.6;
      } else if (mode === 'idle') {
        targetAmp = 0.03 + Math.sin(t * 2) * 0.01;
      }

      // Smooth amplitude transitions
      smoothAmp.current += (targetAmp - smoothAmp.current) * 0.15;
      
      // Global bounding amplitude to scale to container
      const globalAmp = smoothAmp.current * (H * 0.4);

      // Draw each wave
      // We do 2 passes: 1 for reflection (flipped, lower opacity), 1 for main
      const drawWaves = (isReflection: boolean) => {
        ctx.save();
        if (isReflection) {
           ctx.translate(0, centerY * 2 + 10);
           ctx.scale(1, -0.6); // Flip vertically, scale down slightly
           ctx.globalAlpha = 0.3; // faded reflection
           // Mask the reflection so it fades out at the bottom
           const grad = ctx.createLinearGradient(0, centerY, 0, H);
           grad.addColorStop(0, 'rgba(0,0,0,1)');
           grad.addColorStop(1, 'rgba(0,0,0,0)');
        }

        // Add a slight horizontal squeeze towards edges
        // using a parabolic envelope: 1 at center, 0 at edges
        
        ctx.globalCompositeOperation = 'screen';

        WAVES.forEach(wave => {
          ctx.beginPath();
          ctx.moveTo(0, centerY);

          for (let x = 0; x <= W; x += 5) {
            // Envelope so ends are always tied to centerY
            const nx = x / W; // 0 to 1
            const envelope = Math.sin(nx * Math.PI); // 0 at edges, 1 in middle

            const phaseX = x * wave.freq - t * wave.speed + wave.phaseOffset;
            const yOffset = Math.sin(phaseX) * globalAmp * wave.ampMulti * envelope;

            // Add some high-frequency noise for texture
            const noise = Math.sin(phaseX * 5) * (globalAmp * 0.05) * envelope;
            
            ctx.lineTo(x, centerY + yOffset + noise);
          }
          
          ctx.strokeStyle = wave.color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          if (!isReflection) {
            ctx.shadowColor = wave.color;
            ctx.shadowBlur = 15;
          } else {
            ctx.shadowBlur = 0;
            ctx.filter = 'blur(4px)'; // extra blur on reflection
          }

          ctx.stroke();
        });
        
        ctx.restore();
      };

      drawWaves(true);  // Reflection
      drawWaves(false); // Main waves

      // Center bright line tying it together
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(W, centerY);
      const grad = ctx.createLinearGradient(0, centerY, W, centerY);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      frameRef.current = requestAnimationFrame(render);
    }

    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '240px', // Large immersive height
        display: 'block',
      }}
    />
  );
}
