import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { LLMSetupModal } from './components/onboarding/LLMSetupModal';
import { BinanceSetupModal } from './components/onboarding/BinanceSetupModal';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { NewsPage } from './pages/NewsPage';
import { IndicatorsPage } from './pages/IndicatorsPage';
import { RiskPage } from './pages/RiskPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { RefreshCw } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading, showLLMSetup, showBinanceSetup } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060911] flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-sm font-semibold tracking-wider uppercase">Loading Krypton Intelligence...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Onboarding Modals */}
      {showLLMSetup && <LLMSetupModal />}
      {showBinanceSetup && <BinanceSetupModal />}

      {/* Top Navbar */}
      <Navbar currentTab={activeTab} />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#090d16] to-[#060911]">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'news' && <NewsPage />}
          {activeTab === 'indicators' && <IndicatorsPage />}
          {activeTab === 'risk' && <RiskPage />}
          {activeTab === 'chat' && <ChatPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
