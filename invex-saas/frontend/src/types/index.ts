export interface Session {
    session_id: string;
    user_name: string;
    created_at: string;
    status: string;
    messages: Message[];
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

export interface AgentRun {
    run_id: string;
    session_id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
    created_at: string;
    duration_ms?: number;
}

export interface ApiResponse<T> {
    data: T;
    error?: string;
}
