/**
 * frontend/lib/apiClient.ts
 * Wrapper around fetch API methods. Automatically applies Authorization token.
 */

import { getToken, clearAuth } from './auth';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = getToken();

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
        // Token might be expired or invalid
        clearAuth();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
    }

    return response;
}

export async function apiGet(url: string) {
    return fetchWithAuth(url, { method: 'GET' });
}

export async function apiPost(url: string, body: any) {
    return fetchWithAuth(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

export async function apiDelete(url: string) {
    return fetchWithAuth(url, { method: 'DELETE' });
}
