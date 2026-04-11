import { Sidebar } from '@/components/dashboard/Sidebar';
import { IndexBar } from '@/components/market/IndexBar';
import { AlertsProvider } from '@/components/alerts/AlertsContext';
import { AlertToastContainer } from '@/components/alerts/AlertToast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
