import React from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
            <Sidebar />
            <main style={{ marginLeft: '220px', flex: 1 }}>
                {children}
            </main>
        </div>
    );
}
