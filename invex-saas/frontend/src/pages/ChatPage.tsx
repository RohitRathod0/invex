import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { Loader2 } from 'lucide-react';

export const ChatPage = () => {
    //   const { sessionId } = useParams();
    //   const navigate = useNavigate();
    const { currentSession, sendMessage, createSession, isLoading, error } = useAppStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial session check - simplified for MVP
    useEffect(() => {
        if (!currentSession) {
            // Check URL or create new
            createSession();
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentSession?.messages, isLoading]);

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-background scrollbar-thin scrollbar-thumb-gray-300">
                <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-end">
                    {!currentSession ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-accent-blue" size={32} />
                            <span className="ml-2 text-gray-500">Initializing session...</span>
                        </div>
                    ) : currentSession.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
                            <h2 className="text-xl font-semibold text-gray-800">Welcome to Invex AI Chat</h2>
                            <p className="text-gray-500 text-sm max-w-md">
                                Ask me anything about your portfolio, specific stocks, general market performance, or investment strategies.
                            </p>
                        </div>
                    ) : (
                        currentSession.messages.map((msg, idx) => (
                            <ChatMessage key={idx} message={msg} />
                        ))
                    )}

                    {isLoading && currentSession && currentSession.messages[currentSession.messages.length - 1]?.role === 'user' && (
                        <div className="flex justify-start w-full mb-6">
                            <div className="flex flex-row items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-primary-mid flex items-center justify-center text-white text-xs">AI</div>
                                <div className="p-4 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center space-x-2">
                                    <span className="flex space-x-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <ChatInput onSend={(msg) => sendMessage(msg, { execution_mode: 'chat' })} disabled={isLoading} />
        </div>
    );
};
