import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import AuthPage from "./AuthPage";
import LLMSetupPage from "./LLMSetupPage";
import BinanceSetupPage from "./BinanceSetupPage";
import DashboardPage from "./DashboardPage";
import NewsPage from "./NewsPage";
import IndicatorsPage from "./IndicatorsPage";
import { statusAPI, getToken } from "../config/api";
import type { OnboardingStatus } from "../config/api";

type Page = "loading" | "auth" | "llm-setup" | "binance-setup" | "dashboard" | "news" | "indicators";

interface AppState {
  email: string | null;
  onboarding: OnboardingStatus | null;
}

export default function App() {
  const [page, setPage] = useState<Page>("loading");
  const [appState, setAppState] = useState<AppState>({ email: null, onboarding: null });

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setPage("auth");
        return;
      }
      try {
        const onboarding = await statusAPI.getOnboarding();
        setAppState((s) => ({ ...s, onboarding }));
        setPage(onboarding.llm_key_set ? "dashboard" : "llm-setup");
      } catch {
        setPage("auth");
      }
    }
    bootstrap();
  }, []);

  async function handleAuthSuccess(email: string) {
    setAppState((s) => ({ ...s, email }));

    try {
      const onboarding = await statusAPI.getOnboarding();
      setAppState((s) => ({ ...s, onboarding }));
      setPage(onboarding.llm_key_set ? "dashboard" : "llm-setup");
    } catch {
      setPage("llm-setup");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        {page === "loading" && (
          <div key="loading" className="flex items-center justify-center min-h-screen text-muted-foreground">
            Loading...
          </div>
        )}

        {page === "auth" && <AuthPage key="auth" onSuccess={handleAuthSuccess} />}

        {page === "llm-setup" && (
          <LLMSetupPage
            key="llm-setup"
            onNext={() => setPage("binance-setup")}
          />
        )}

        {page === "binance-setup" && (
          <BinanceSetupPage
            key="binance-setup"
            onNext={() => setPage("dashboard")}
            onSkip={() => setPage("dashboard")}
          />
        )}

        {page === "dashboard" && (
          <DashboardPage
            key="dashboard"
            email={appState.email}
            onNavigateToNews={() => setPage("news")}
            onNavigateToIndicators={() => setPage("indicators")}
          />
        )}

        {page === "news" && (
          <NewsPage
            key="news"
            onBackToDashboard={() => setPage("dashboard")}
            onNavigateToIndicators={() => setPage("indicators")}
          />
        )}

        {page === "indicators" && (
          <IndicatorsPage
            key="indicators"
            onBackToDashboard={() => setPage("dashboard")}
            onNavigateToNews={() => setPage("news")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}