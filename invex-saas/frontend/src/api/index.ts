import apiClient from './apiClient';
import type { Session, AgentRun } from '../types';

export const sessionApi = {
    create: async (userName: string = 'Anonymous') => {
        const response = await apiClient.post<Session>('/sessions/', { user_name: userName });
        return response.data;
    },

    get: async (sessionId: string) => {
        const response = await apiClient.get<Session>(`/sessions/${sessionId}`);
        return response.data;
    },

    list: async (limit: number = 20, offset: number = 0) => {
        const response = await apiClient.get<{ sessions: Session[], total: number }>(`/sessions/?limit=${limit}&offset=${offset}`);
        return response.data;
    }
};

export const agentApi = {
    run: async (sessionId: string, message: string, inputs?: any) => {
        const response = await apiClient.post<AgentRun>('/agents/run', {
            session_id: sessionId,
            message,
            inputs, // Pass inputs to backend
            stream: false // MVP Sync
        });
        return response.data;
    }
};
