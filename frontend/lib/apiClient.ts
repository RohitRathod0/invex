/**
 * lib/apiClient.ts
 *
 * Centralised fetch wrapper.
 * - Always sends credentials (cookies) so HttpOnly JWTs are included.
 * - On 401: attempts one silent token refresh, then redirects to /login.
 * - On 403: redirects to /login immediately.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';   // empty = use Next.js proxy

let _isRefreshing = false;

async function _refresh(): Promise<boolean> {
    if (_isRefreshing) return false;
    _isRefreshing = true;
    try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
            method:      'POST',
            credentials: 'include',
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        _isRefreshing = false;
    }
}

async function _fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const config: RequestInit = {
        ...options,
        credentials: 'include',   // always send HttpOnly cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    let response = await fetch(`${BASE_URL}${url}`, config);

    // Transparent token refresh on 401
    if (response.status === 401) {
        const refreshed = await _refresh();
        if (refreshed) {
            // Retry the original request with the new access cookie
            response = await fetch(`${BASE_URL}${url}`, config);
        }
    }

    // Still unauthorized after refresh → go to login
    if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
    }

    return response;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function apiGet(url: string, options?: RequestInit) {
    return _fetchWithAuth(url, { method: 'GET', ...options });
}

export async function apiPost(url: string, body?: unknown, options?: RequestInit) {
    return _fetchWithAuth(url, {
        method: 'POST',
        body:   body !== undefined ? JSON.stringify(body) : undefined,
        ...options,
    });
}

export async function apiPut(url: string, body?: unknown) {
    return _fetchWithAuth(url, {
        method: 'PUT',
        body:   body !== undefined ? JSON.stringify(body) : undefined,
    });
}

export async function apiPatch(url: string, body?: unknown) {
    return _fetchWithAuth(url, {
        method: 'PATCH',
        body:   body !== undefined ? JSON.stringify(body) : undefined,
    });
}

export async function apiDelete(url: string) {
    return _fetchWithAuth(url, { method: 'DELETE' });
}
