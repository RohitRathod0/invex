"use client";

interface Option {
    label: string;
    value: string;
}

interface QuizStepProps {
    question: string;
    description?: string;
    options: Option[];
    selected?: string;
    onSelect: (value: string) => void;
}

export const QuizStep = ({ question, description, options, selected, onSelect }: QuizStepProps) => {
    return (
        <div className="w-full space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white leading-snug">{question}</h2>
                {description && <p className="text-gray-400 mt-2 text-sm">{description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onSelect(opt.value)}
                        className={`text-left w-full px-5 py-4 rounded-2xl border transition-all duration-150 font-medium text-sm ${selected === opt.value
                                ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135] shadow-[0_0_0_1px_#C8F135]'
                                : 'border-white/[0.08] text-gray-300 hover:border-white/20 hover:text-white bg-white/[0.02]'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
