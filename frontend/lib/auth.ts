/**
 * lib/auth.ts
 *
 * Client-side auth helpers.
 * JWTs are stored as HttpOnly cookies by the backend — we never touch them.
 * We store user profile info in sessionStorage for UI convenience.
 */

const PROFILE_KEY = 'invex_user';

export interface UserProfile {
    user_id:    string;
    name:       string;
    email:      string;
    status:     string;
    created_at: string;
    last_login: string | null;
}

// ── Profile cache ─────────────────────────────────────────────────────────────

export function setUserProfile(profile: UserProfile) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getUserProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(PROFILE_KEY);
        return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
        return null;
    }
}

export function clearUserProfile() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(PROFILE_KEY);
}

// ── Convenience getters ───────────────────────────────────────────────────────

export function getUserName(): string {
    return getUserProfile()?.name ?? '';
}

export function getUserEmail(): string {
    return getUserProfile()?.email ?? '';
}

export function getUserId(): string {
    return getUserProfile()?.user_id ?? '';
}

/** First name only */
export function getFirstName(): string {
    const name = getUserName();
    return name.split(' ')[0] ?? name;
}

// ── Auth state ────────────────────────────────────────────────────────────────

/**
 * Check if the user appears to be logged in.
 * Because the JWT is HttpOnly, we rely on the cached profile.
 * For hard auth checks use GET /api/v1/auth/me instead.
 */
export function isAuthenticated(): boolean {
    return !!getUserProfile();
}

// ── Logout helper ─────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
    try {
        await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore network errors */ }
    clearUserProfile();
    window.location.href = '/login';
}

// ── Legacy shim (keeps old callers working) ───────────────────────────────────
/** @deprecated Use setUserProfile() instead */
export function setToken(_token: string, _userId: string, name?: string, email?: string) {
    // No-op for token — it's in an HttpOnly cookie now.
    // Store whatever name/email we have for the profile cache.
    if (name || email) {
        const existing = getUserProfile();
        setUserProfile({
            user_id:    existing?.user_id    ?? _userId,
            name:       name                 ?? existing?.name    ?? '',
            email:      email                ?? existing?.email   ?? '',
            status:     existing?.status     ?? 'ACTIVE',
            created_at: existing?.created_at ?? new Date().toISOString(),
            last_login: existing?.last_login ?? null,
        });
    }
}

/** @deprecated Use getUserProfile() instead */
export function getStoredUser() {
    const p = getUserProfile();
    if (!p) return null;
    return { sub: p.user_id, name: p.name, email: p.email };
}

/** @deprecated JWT is now HttpOnly — always returns null */
export function getToken(): string | null { return null; }

/** @deprecated Use logout() instead */
export function clearAuth() { clearUserProfile(); }
