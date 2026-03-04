import { Sidebar } from '@/components/dashboard/Sidebar';

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
            <Sidebar />
            <div style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
                {children}
            </div>
        </div>
    );
}
