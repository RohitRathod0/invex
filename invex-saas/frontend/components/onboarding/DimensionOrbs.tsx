'use client';

/**
 * components/onboarding/DimensionOrbs.tsx
 *
 * 6 animated circular progress orbs — one per risk dimension.
 * Empty (grey) → filling (amber) → complete (lime green) as each
 * dimension crosses 80% confidence.
 */

interface DimensionOrbsProps {
    scores: Record<string, number>;   // dim → 0-100
}

const DIMENSION_META: { key: string; label: string; icon: string }[] = [
    { key: 'loss_tolerance',  label: 'Risk Tolerance',  icon: '⚡' },
    { key: 'horizon',         label: 'Time Horizon',    icon: '📅' },
    { key: 'income_stability',label: 'Income',          icon: '💼' },
    { key: 'dependents',      label: 'Dependents',      icon: '👨‍👩‍👧' },
    { key: 'sectors',         label: 'Sectors',         icon: '🏭' },
    { key: 'return_risk',     label: 'Return Goals',    icon: '🎯' },
];

const THRESHOLD = 80;

function getColor(score: number): string {
    if (score >= THRESHOLD)   return '#00F2FE';   // complete — neon cyan
    if (score >= 40)          return '#FF0844';   // in progress — neon magenta
    return 'rgba(255,255,255,0.15)';              // not started — faint
}

function getTrailColor(score: number): string {
    if (score >= THRESHOLD)   return 'rgba(0,242,254,0.15)';
    if (score >= 40)          return 'rgba(255,8,68,0.15)';
    return 'rgba(255,255,255,0.05)';
}

function CircularProgress({ score }: { score: number }) {
    const radius = 22;
    const circ   = 2 * Math.PI * radius;
    const offset = circ - (score / 100) * circ;
    const color  = getColor(score);
    const trail  = getTrailColor(score);

    return (
        <svg width="56" height="56" viewBox="0 0 56 56">
            {/* Track */}
            <circle cx="28" cy="28" r={radius} fill="none" stroke={trail} strokeWidth="4" />
            {/* Progress arc */}
            <circle
                cx="28" cy="28" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 28 28)"
                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease' }}
            />
            {/* Center dot */}
            <circle
                cx="28" cy="28" r="4"
                fill={score >= THRESHOLD ? '#00F2FE' : score >= 40 ? '#FF0844' : 'rgba(255,255,255,0.25)'}
                style={{ transition: 'fill 0.4s ease' }}
            />
        </svg>
    );
}

export function DimensionOrbs({ scores }: DimensionOrbsProps) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '4px',
            padding: '16px 0',
        }}>
            {DIMENSION_META.map(({ key, label, icon }) => {
                const score     = scores[key] ?? 0;
                const complete  = score >= THRESHOLD;

                return (
                    <div key={key} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        flex: 1,
                    }}>
                        {/* Circle */}
                        <div style={{ position: 'relative' }}>
                            <CircularProgress score={score} />
                            {/* Icon overlay */}
                            <span style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '14px',
                                marginTop: '-2px',
                            }}>
                                {complete ? '✓' : icon}
                            </span>
                        </div>

                        {/* Label */}
                        <span style={{
                            fontSize: '9px',
                            color: complete ? '#00F2FE' : 'rgba(255,255,255,0.40)',
                            fontWeight: complete ? 700 : 400,
                            textAlign: 'center',
                            lineHeight: 1.2,
                            transition: 'color 0.4s ease',
                            maxWidth: '52px',
                        }}>
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
