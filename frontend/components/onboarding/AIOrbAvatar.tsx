'use client';

/**
 * components/onboarding/AIOrbAvatar.tsx  (v3 — Crystal Glass Globe)
 *
 * Renders a translucent 3D crystal sphere with swirling band rings,
 * specular highlights and a caustic shadow — matching the reference image.
 * No external 3D library. Pure Canvas + rAF.
 */

import { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'completed';

interface Props {
  state:       OrbState;
  audioLevel?: number;
  size?:       number;
}

export function AIOrbAvatar({ state, audioLevel = 0, size = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const stateRef  = useRef<OrbState>(state);
  const ampRef    = useRef<number>(audioLevel);

  useEffect(() => { stateRef.current = state;      }, [state]);
  useEffect(() => { ampRef.current   = audioLevel; }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raw = canvas.getContext('2d');
    if (!raw) return;
    const ctx = raw as CanvasRenderingContext2D;

    const DPR = window.devicePixelRatio || 1;
    const dim = size * DPR;
    canvas.width  = dim;
    canvas.height = dim;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(DPR, DPR);

    const R  = size / 2 - 8;   // sphere radius
    const cx = size / 2;
    const cy = size / 2;

    // ── Draw one latitude ring as an ellipse ─────────────────────────────
    function drawRing(
      t: number,
      tiltDeg: number,
      phase: number,
      alpha: number,
      colorTop: string,
      colorBot: string,
      speed: number,
      distort: number,
    ) {
      const tiltRad   = (tiltDeg * Math.PI) / 180;
      const dynamicTilt = tiltRad + Math.sin(t * speed + phase) * distort;

      const rx = R * 0.92;
      const ry = Math.abs(Math.sin(dynamicTilt)) * R * 0.92;

      // Fade rings near horizon
      if (ry < 2) return;

      const rotAngle = Math.cos(dynamicTilt) * Math.PI * 0.5 + t * speed * 0.15;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotAngle);
      ctx.globalAlpha = alpha;

      const grad = ctx.createLinearGradient(-rx, 0, rx, 0);
      grad.addColorStop(0,    colorTop);
      grad.addColorStop(0.35, colorBot);
      grad.addColorStop(0.65, colorTop);
      grad.addColorStop(1,    colorBot);

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.8;
      ctx.stroke();
      ctx.restore();
    }

    function render(ts: number) {
      const t   = ts / 1000;
      const s   = stateRef.current;
      const amp = ampRef.current;

      // Speed modifier per state
      const spd =
        s === 'idle'      ? 0.25 :
        s === 'listening' ? 0.7  :
        s === 'thinking'  ? 1.6  :
        s === 'speaking'  ? 0.9 + amp * 0.8 :
        0.18;

      ctx.clearRect(0, 0, size, size);

      // ── 1. Outer ambient glow ─────────────────────────────────────────
      const aura = ctx.createRadialGradient(cx, cy - R * 0.1, 0, cx, cy, R * 1.55);
      aura.addColorStop(0,   'rgba(160,130,240,0.22)');
      aura.addColorStop(0.5, 'rgba(130,100,220,0.10)');
      aura.addColorStop(1,   'rgba(100,70,200,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      // ── 2. Sphere body — translucent glass fill ───────────────────────
      const body = ctx.createRadialGradient(
        cx - R * 0.3, cy - R * 0.35, R * 0.05,
        cx, cy, R
      );
      body.addColorStop(0,   'rgba(230, 215, 255, 0.72)');
      body.addColorStop(0.3, 'rgba(185, 158, 245, 0.60)');
      body.addColorStop(0.7, 'rgba(130, 90,  220, 0.50)');
      body.addColorStop(1,   'rgba(80,  50,  180, 0.55)');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.shadowColor = 'rgba(140,100,240,0.30)';
      ctx.shadowBlur  = 28;
      ctx.fill();
      ctx.restore();

      // ── 3. Band rings (latitude lines rotated at angles) ─────────────
      const rings = [
        { deg: 20,  phase: 0,    alpha: 0.55, spColor: 'rgba(200,180,255,0.9)', distort: 0.18 },
        { deg: 45,  phase: 1.1,  alpha: 0.50, spColor: 'rgba(170,140,250,0.8)', distort: 0.22 },
        { deg: 70,  phase: 2.3,  alpha: 0.45, spColor: 'rgba(150,110,245,0.7)', distort: 0.20 },
        { deg: 100, phase: 3.5,  alpha: 0.40, spColor: 'rgba(130, 90,240,0.6)', distort: 0.24 },
        { deg: 130, phase: 0.7,  alpha: 0.38, spColor: 'rgba(110, 70,235,0.5)', distort: 0.19 },
        { deg: 160, phase: 1.9,  alpha: 0.32, spColor: 'rgba(180,150,255,0.6)', distort: 0.16 },
        { deg: 10,  phase: 4.2,  alpha: 0.28, spColor: 'rgba(210,195,255,0.5)', distort: 0.14 },
        { deg: 55,  phase: 5.1,  alpha: 0.35, spColor: 'rgba(140, 95,240,0.55)',distort: 0.21 },
      ];

      // Clip rings to sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      for (const r of rings) {
        drawRing(
          t, r.deg, r.phase, r.alpha,
          r.spColor,
          'rgba(90,50,200,0.30)',
          spd, r.distort,
        );
      }
      ctx.restore();

      // ── 4. Specular highlight (top-left, sharp) ───────────────────────
      const spec = ctx.createRadialGradient(
        cx - R * 0.38, cy - R * 0.42, 0,
        cx - R * 0.38, cy - R * 0.42, R * 0.38,
      );
      spec.addColorStop(0, 'rgba(255,255,255,0.75)');
      spec.addColorStop(0.4,'rgba(255,255,255,0.18)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      // ── 5. Secondary soft highlight (bottom-right) ────────────────────
      const spec2 = ctx.createRadialGradient(
        cx + R * 0.35, cy + R * 0.35, 0,
        cx + R * 0.35, cy + R * 0.35, R * 0.45,
      );
      spec2.addColorStop(0, 'rgba(200,180,255,0.25)');
      spec2.addColorStop(1, 'rgba(200,180,255,0)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = spec2;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      // ── 6. Sphere rim (thin bright edge) ─────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,200,255,0.55)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
      ctx.restore();

      // ── 7. Speaking pulse rings ───────────────────────────────────────
      if (s === 'speaking' || s === 'listening') {
        const maxRings = s === 'speaking' ? 3 : 2;
        for (let i = 0; i < maxRings; i++) {
          const ringAge = ((t * (spd * 0.6) + i / maxRings) % 1);
          const ringR   = R + ringAge * R * 0.6;
          const alpha   = (1 - ringAge) * 0.22 * (s === 'speaking' ? 1 + amp : 1);
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(160,120,255,${alpha})`;
          ctx.lineWidth   = 1.5;
          ctx.stroke();
        }
      }

      // ── 8. Thinking orbit dots ────────────────────────────────────────
      if (s === 'thinking') {
        for (let d = 0; d < 5; d++) {
          const angle  = t * spd * 2 + (d / 5) * Math.PI * 2;
          const orbitR = R + 14;
          const dx = cx + Math.cos(angle) * orbitR;
          const dy = cy + Math.sin(angle) * orbitR;
          ctx.beginPath();
          ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(160,120,255,${0.6 + Math.sin(t * 3 + d) * 0.3})`;
          ctx.fill();
        }
      }

      // ── 9. Floating animation ─────────────────────────────────────────
      frameRef.current = requestAnimationFrame(render);
    }

    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block' }}
    />
  );
}
