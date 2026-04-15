/**
 * frontend/lib/auth.ts
 * Helper functions to manage the authentication token.
 */

const TOKEN_KEY = 'invex_session';
const USER_ID_KEY = 'invex_user_id';

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, userId: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_ID_KEY, userId);
}

export function clearAuth() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
}

export function getStoredUser(): any | null {
    const token = getToken();
    if (!token) return null;
    try {
        const payloadStr = atob(token.split('.')[1]);
        return JSON.parse(payloadStr);
    } catch {
        return null; // Invalid token
    }
}
