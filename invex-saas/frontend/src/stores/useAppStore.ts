import { create } from 'zustand';
import type { Session, Message } from '../types';
import { sessionApi, agentApi } from '../api';

interface AppState {
    currentSession: Session | null;
    sessions: Session[];
    isLoading: boolean;
    error: string | null;

    // Actions
    createSession: (userName?: string) => Promise<void>;
    fetchSession: (sessionId: string) => Promise<void>;
    sendMessage: (message: string, inputs?: any) => Promise<void>;
    clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    currentSession: null,
    sessions: [],
    isLoading: false,
    error: null,

    createSession: async (userName = 'Anonymous') => {
        set({ isLoading: true, error: null });
        try {
            const session = await sessionApi.create(userName);
            set({ currentSession: session });
        } catch (err: any) {
            set({ error: err.message || 'Failed to create session' });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchSession: async (sessionId: string) => {
        set({ isLoading: true, error: null });
        try {
            const session = await sessionApi.get(sessionId);
            set({ currentSession: session });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch session' });
        } finally {
            set({ isLoading: false });
        }
    },

    sendMessage: async (message: string, inputs?: any) => {
        const { currentSession } = get();
        if (!currentSession) return;

        // Optimistic update
        const userMsg: Message = { role: 'user', content: message, timestamp: new Date().toISOString() };
        const updatedSession = { ...currentSession, messages: [...currentSession.messages, userMsg] };

        set({ currentSession: updatedSession, isLoading: true });

        try {
            const result = await agentApi.run(currentSession.session_id, message, inputs);

            const agentMsg: Message = {
                role: 'assistant',
                content: result.result
                    || (result.error ? `⚠️ Analysis failed: ${result.error}` : "No response received."),
                timestamp: new Date().toISOString()
            };

            set(state => ({
                currentSession: state.currentSession ? {
                    ...state.currentSession,
                    messages: [...state.currentSession.messages, agentMsg]
                } : null,
                isLoading: false
            }));

        } catch (err: any) {
            set({ error: err.message || 'Failed to send message', isLoading: false });
        }
    },

    clearError: () => set({ error: null })
}));
