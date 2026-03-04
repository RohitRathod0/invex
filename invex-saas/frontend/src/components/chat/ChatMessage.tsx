import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Download } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Message } from '../../types';

interface ChatMessageProps {
    message: Message;
    isLastAssistant?: boolean;  // show download button on last AI response
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLastAssistant }) => {
    const isUser = message.role === 'user';

    const handleDownload = async () => {
        try {
            const res = await fetch('/api/v1/documents/report/download');
            if (!res.ok) {
                alert('No report available yet. Run an analysis first.');
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'invex_investment_report.md';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Failed to download report.');
        }
    };

    return (
        <div className={cn(
            "flex w-full mb-6",
            isUser ? "justify-end" : "justify-start"
        )}>
            <div className={cn(
                "flex max-w-[80%] md:max-w-[70%]",
                isUser ? "flex-row-reverse" : "flex-row"
            )}>
                {/* Avatar */}
                <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
                    isUser ? "ml-3 bg-accent-blue" : "mr-3 bg-primary-mid"
                )}>
                    {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>

                {/* Message Bubble + Download */}
                <div className="flex flex-col">
                    <div className={cn(
                        "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                        isUser
                            ? "bg-accent-blue text-white rounded-tr-sm"
                            : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
                    )}>
                        {isUser ? (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        ) : (
                            <div className="prose prose-sm max-w-none prose-slate">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Download Report button — shown only on last assistant message 
                        and only when it has real content (not error/no-response) */}
                    {!isUser && isLastAssistant && message.content && !message.content.startsWith('⚠️') && message.content !== 'No response received.' && (
                        <button
                            onClick={handleDownload}
                            className="mt-2 self-start flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                        >
                            <Download size={14} />
                            Download Full Report (.md)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
