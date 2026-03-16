import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowUp } from 'lucide-react';
import ModeSelector, { MODES, Mode } from './ModeSelector';

interface ChatInputProps {
    onSend: (message: string) => Promise<void>;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
    const [input, setInput] = useState('');
    const [activeMode, setActiveMode] = useState<Mode>(MODES.find(m => m.id === 'agent-debrief') || MODES[0]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || disabled) return;

        const message = input;
        setInput('');

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await onSend(message);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const placeholders: Record<string, string> = {
        'agent-debrief': "Ask about any analysis... e.g. 'Why did you rate NIFTY 50 a BUY?'",
        'news-radar': "Ask about news... e.g. 'How does RBI rate hold affect my portfolio?'",
        'what-if': "Run a scenario... e.g. 'What if I invested ₹1L in Gold last year?'",
        'calm-mode': "Tell me what's worrying you about the market...",
        'my-ai': "Ask anything... e.g. 'What have you learned about me so far?'"
    };

    return (
        <div className="p-4 w-full bg-[#0a0a0a]">
            {/* The relative container is essential here for the floating ModeSelector panel */}
            <div className="max-w-4xl mx-auto relative">

                {/* The new InputBar Design */}
                <div className="flex items-end gap-3 bg-[rgba(255,255,255,0.06)] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-all shadow-lg">

                    <div className="pb-[2px]">
                        <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholders[activeMode.id]}
                        rows={1}
                        className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-1.5 max-h-48 text-white placeholder-gray-500 text-[15px] outline-none"
                        disabled={disabled}
                    />

                    <button
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || disabled}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 flex-shrink-0 mb-[2px]"
                        style={{ backgroundColor: input.trim() && !disabled ? activeMode.color : 'rgba(255,255,255,0.1)' }}
                    >
                        {disabled ? (
                            <Loader2 size={18} className="animate-spin text-black" />
                        ) : (
                            <ArrowUp size={18} className={input.trim() && !disabled ? "text-black" : "text-gray-500"} />
                        )}
                    </button>

                </div>
            </div>

            <p className="text-center text-[12px] text-gray-500 mt-3">
                Invex AI can make mistakes. Consider checking important information.
            </p>
        </div>
    );
};
