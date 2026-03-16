import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/useAuthStore';

import { PortfolioPage } from './pages/PortfolioPage';

// Placeholder Pages
const AnalysisPage = () => <div className="p-8 text-white"><h1 className="text-3xl font-bold">Analysis Page Placeholder</h1></div>;
const ScreenerPage = () => <div className="p-8 text-white"><h1 className="text-3xl font-bold">Screener Page Placeholder</h1></div>;
const GoalsPage = () => <div className="p-8 text-white"><h1 className="text-3xl font-bold">Goals Page Placeholder</h1></div>;
const AlertsPage = () => <div className="p-8 text-white"><h1 className="text-3xl font-bold">Alerts Page Placeholder</h1></div>;
const NewsPage = () => <div className="p-8 text-white"><h1 className="text-3xl font-bold">Market News Page Placeholder</h1></div>;
const SettingsPage = () => <div className="p-8 text-white"><h1 className="text-3xl font-bold">Settings Page Placeholder</h1></div>;

// Redirect to /login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Redirect authenticated users away from /login
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/screener" element={<ScreenerPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
