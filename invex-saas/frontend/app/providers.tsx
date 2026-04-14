'use client';

/**
 * app/providers.tsx
 * Client-side providers wrapper so RootLayout stays a Server Component.
 * Wraps the entire app with UserContextProvider.
 */

import { UserContextProvider } from '@/lib/userContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <UserContextProvider>
            {children}
        </UserContextProvider>
    );
}
