import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import AuthPage from "./AuthPage";
import LLMSetupPage from "./LLMSetupPage";
import BinanceSetupPage from "./BinanceSetupPage";
import DashboardPage from "./DashboardPage";
import { statusAPI, getToken } from "../config/api";
import type { OnboardingStatus } from "../config/api";

type Page = "loading" | "auth" | "llm-setup" | "binance-setup" | "dashboard";

interface AppState {
  // NOTE: no `user` object anymore -- the backend's /auth/login only
  // returns an access_token, not a user record (no /auth/me endpoint
  // exists yet). We just remember the email the person typed in, purely
  // for display (e.g. "Signed in as ...") -- it's not used for any
  // actual authorization, the JWT handles that invisibly on every request.
  email: string | null;

  // NOTE: no `llmConfig` / `binanceConfig` here either -- those held
  // the raw API key/secret client-side in the original version, but
  // the backend never returns key material back out once stored (it's
  // encrypted at rest, one-way from the frontend's perspective). All
  // the frontend ever needs is STATUS -- is a key set, is it valid, is
  // Binance connected -- which is exactly what OnboardingStatus is.
  onboarding: OnboardingStatus | null;
}

export default function App() {
  const [page, setPage] = useState<Page>("loading");
  const [appState, setAppState] = useState<AppState>({ email: null, onboarding: null });

  // On first mount: if a token already exists (e.g. the user refreshed
  // the page -- sessionStorage survives a refresh, just not a closed
  // tab), check onboarding status and route straight to the right
  // screen instead of always dumping the user back on the auth page.
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
        // Token existed but was invalid/expired -- apiFetch's 401
        // handler already cleared it; just land on the auth screen.
        setPage("auth");
      }
    }
    bootstrap();
  }, []);

  // Called by AuthPage once login succeeds (AuthPage internally handles
  // signup -> OTP verify -> login as its own multi-step flow; by the
  // time onSuccess fires, a token is already stored).
  async function handleAuthSuccess(email: string) {
    setAppState((s) => ({ ...s, email }));

    // A RETURNING user who already has an LLM key set (and maybe
    // Binance connected) should land straight on the dashboard, not be
    // forced through setup screens again every time they log in.
    try {
      const onboarding = await statusAPI.getOnboarding();
      setAppState((s) => ({ ...s, onboarding }));
      setPage(onboarding.llm_key_set ? "dashboard" : "llm-setup");
    } catch {
      setPage("llm-setup"); // safest fallback if the status check itself fails
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
            // LLMSetupPage calls llmKeyAPI.setKey() itself and just
            // reports success here -- there's no config object to pass
            // up anymore, the key already lives encrypted on the backend.
            onNext={() => setPage("binance-setup")}
          />
        )}

        {page === "binance-setup" && (
          <BinanceSetupPage
            key="binance-setup"
            // Binance is OPTIONAL. A successful connect and an explicit
            // skip both lead to the dashboard -- never gate the rest of
            // the app on this step being completed.
            onNext={() => setPage("dashboard")}
            onSkip={() => setPage("dashboard")}
          />
        )}

        {page === "dashboard" && (
          // DashboardPage fetches everything it needs itself (indicators,
          // news, risk, agent responses) directly from the backend on
          // mount -- it doesn't need appState's configs passed down,
          // just enough to personalize the header (email).
          <DashboardPage key="dashboard" email={appState.email} />
        )}
      </AnimatePresence>
    </div>
  );
}