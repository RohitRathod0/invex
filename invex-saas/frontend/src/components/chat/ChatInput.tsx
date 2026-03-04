import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ChatInputProps {
    onSend: (message: string) => Promise<void>;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
    const [input, setInput] = useState('');
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

    return (
        <div className="p-4 bg-white border-t border-gray-200">
            <div className="max-w-4xl mx-auto relative flex items-end bg-gray-50 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-accent-blue focus-within:border-transparent transition-all shadow-sm">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Invex about market trends, asset allocation, or portfolio optimization..."
                    rows={1}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none py-3 pl-4 pr-12 max-h-48 text-gray-800 placeholder-gray-400"
                    disabled={disabled}
                />
                <button
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || disabled}
                    className={cn(
                        "absolute right-2 bottom-2 p-2 rounded-lg transition-colors",
                        input.trim() && !disabled
                            ? "bg-accent-blue text-white hover:bg-blue-600"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {disabled ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
                Invex AI can make mistakes. Consider checking important information.
            </p>
        </div>
    );
};
