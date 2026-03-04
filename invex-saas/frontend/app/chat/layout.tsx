import { Sidebar } from '@/components/dashboard/Sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
            <Sidebar />
            <div style={{ marginLeft: '220px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>
        </div>
    );
}
