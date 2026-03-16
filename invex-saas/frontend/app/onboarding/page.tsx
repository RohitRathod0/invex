"use client";

import { useState } from 'react';
import { Diamond, ArrowRight } from 'lucide-react';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { QuizStep } from '@/components/onboarding/QuizStep';
import { ResultsCard } from '@/components/onboarding/ResultsCard';

const USER_ID = "0000-user";

const QUESTIONS = [
    {
        key: 'q1',
        question: 'What is your age group?',
        description: 'Younger investors can typically take on higher risk.',
        options: [
            { label: '18–25 years', value: '3' },
            { label: '26–35 years', value: '3' },
            { label: '36–50 years', value: '2' },
            { label: '51+ years', value: '1' },
        ],
    },
    {
        key: 'q2',
        question: 'What is your annual income?',
        description: 'Higher income generally supports greater risk capacity.',
        options: [
            { label: 'Under ₹5 LPA', value: '1' },
            { label: '₹5L – ₹15 LPA', value: '2' },
            { label: '₹15L – ₹50 LPA', value: '3' },
            { label: 'Above ₹50 LPA', value: '3' },
        ],
    },
    {
        key: 'q3',
        question: 'How long can you leave your money invested?',
        description: 'Longer horizons allow recovery from short-term losses.',
        options: [
            { label: 'Less than 1 year', value: '1' },
            { label: '1–3 years', value: '2' },
            { label: '3–7 years', value: '2' },
            { label: '7+ years', value: '3' },
        ],
    },
    {
        key: 'q4',
        question: 'If your portfolio dropped 20% in a month, what would you do?',
        options: [
            { label: 'Sell everything immediately', value: '1' },
            { label: 'Sell some to stop losses', value: '1' },
            { label: 'Hold and wait for recovery', value: '2' },
            { label: 'Buy more — it\'s on sale!', value: '3' },
        ],
    },
    {
        key: 'q5',
        question: 'How much investing experience do you have?',
        options: [
            { label: 'None — just starting out', value: '1' },
            { label: 'I have a few mutual funds / SIPs', value: '2' },
            { label: 'I actively trade stocks or crypto', value: '3' },
            { label: 'I manage a diversified portfolio', value: '3' },
        ],
    },
];

// Step 0 = Welcome, Steps 1-5 = Quiz, Step 6 = Results
const TOTAL_STEPS = QUESTIONS.length;

type Results = { risk_score: number; risk_label: string } | null;

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Results>(null);
    const [loading, setLoading] = useState(false);

    const currentQ = step >= 1 && step <= TOTAL_STEPS ? QUESTIONS[step - 1] : null;

    const handleSelect = (value: string) => {
        if (!currentQ) return;
        setAnswers(prev => ({ ...prev, [currentQ.key]: value }));
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS) {
            setStep(s => s + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/onboarding/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: USER_ID, answers }),
            });
            const data = await res.json();
            setResults({ risk_score: data.risk_score, risk_label: data.risk_label });
            setStep(TOTAL_STEPS + 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const canProceed = step === 0 || (currentQ && answers[currentQ.key]);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Card */}
                <div className="bg-[#0D0D0D] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-[#C8F135] flex items-center justify-center">
                            <Diamond size={18} color="black" fill="black" />
                        </div>
                        <span className="font-bold text-white text-lg">Invex <span className="text-[#C8F135]">AI</span></span>
                    </div>

                    {/* Welcome Screen */}
                    {step === 0 && (
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white leading-tight">
                                    Welcome to<br />Invex AI 🎉
                                </h1>
                                <p className="text-gray-400 mt-3">
                                    Let's take 2 minutes to understand your investment style so we can tailor the platform just for you.
                                </p>
                            </div>
                            <div className="space-y-3 py-2">
                                {['Personalized portfolio recommendations', 'Risk-matched investment strategies', 'Tailored AI market insights'].map(item => (
                                    <div key={item} className="flex items-center gap-3 text-sm text-gray-300">
                                        <span className="w-5 h-5 rounded-full bg-[#C8F135]/20 flex items-center justify-center text-[#C8F135] text-xs font-bold flex-shrink-0">✓</span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quiz Steps */}
                    {step >= 1 && step <= TOTAL_STEPS && currentQ && (
                        <>
                            <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
                            <QuizStep
                                question={currentQ.question}
                                description={currentQ.description}
                                options={currentQ.options}
                                selected={answers[currentQ.key]}
                                onSelect={handleSelect}
                            />
                        </>
                    )}

                    {/* Results */}
                    {step === TOTAL_STEPS + 1 && results && (
                        <ResultsCard riskScore={results.risk_score} riskLabel={results.risk_label} />
                    )}

                    {/* Next / Submit button */}
                    {step <= TOTAL_STEPS && (
                        <button
                            onClick={handleNext}
                            disabled={!canProceed || loading}
                            className="mt-8 w-full flex items-center justify-center gap-2 bg-[#C8F135] hover:bg-[#bce628] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(200,241,53,0.15)]"
                        >
                            {loading ? 'Saving...' : step === TOTAL_STEPS ? 'See My Results' : step === 0 ? 'Get Started' : 'Next'}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
