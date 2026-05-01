'use client';
import React from 'react';
import { CheckCircle } from 'lucide-react';

interface ChatBubbleProps {
    userMessage?: string;
    aiResponse?: string;
    compact?: boolean;
}

export function ChatBubble({ userMessage, aiResponse, compact = false }: ChatBubbleProps) {
    return (
        <div className={`space-y-3 ${compact ? 'text-xs' : 'text-sm'}`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8F135] to-green-500 flex items-center justify-center">
                    <span className="text-black text-xs font-bold">AI</span>
                </div>
                <span className="font-semibold text-white">Invex AI</span>
                <CheckCircle size={14} className="text-[#C8F135] ml-auto" />
            </div>

            {/* User bubble */}
            {userMessage && (
                <div className="flex justify-end">
                    <div className="bg-white/10 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-white/90">
                        {userMessage}
                    </div>
                </div>
            )}

            {/* AI bubble */}
            {aiResponse && (
                <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#C8F135]/20 border border-[#C8F135]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[#C8F135] text-[8px] font-bold">AI</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] text-white/80 leading-relaxed">
                        {aiResponse}
                    </div>
                </div>
            )}

            {/* View transaction button */}
            <div className="flex justify-end">
                <button className="bg-[#C8F135] text-black text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#d6f855] transition-colors">
                    View transaction
                </button>
            </div>
        </div>
    );
}
