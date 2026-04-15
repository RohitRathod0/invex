'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { IndexBar } from '@/components/market/IndexBar';
import { AlertsProvider } from '@/components/alerts/AlertsContext';
import { AlertToastContainer } from '@/components/alerts/AlertToast';
import { apiGet } from '@/lib/apiClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await apiGet('http://localhost:8000/api/v1/auth/me');
                if (res.ok) {
                    setAuthorized(true);
                } else {
                    router.replace('/login');
                }
            } catch (error) {
                router.replace('/login');
            }
        }
        checkAuth();
    }, [router]);

    // Show nothing while the auth check is in progress (prevents flash of dashboard)
    if (!authorized) {
        return (
            <div style={{
                minHeight: '100vh', background: '#0A0A0A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    width: '32px', height: '32px', border: '3px solid rgba(200,241,53,0.2)',
                    borderTopColor: '#C8F135', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <AlertsProvider>
            <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
                <Sidebar />
                {/* Main area offset by sidebar width */}
                <div style={{ marginLeft: '220px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <IndexBar />
                    <main style={{ flex: 1 }}>
                        {children}
                    </main>
                </div>
            </div>
            {/* Global toast — renders on top of everything, anywhere in the dashboard */}
            <AlertToastContainer />
        </AlertsProvider>
    );
}
