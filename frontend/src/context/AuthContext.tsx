import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getToken, clearToken, statusAPI, type OnboardingStatus } from "../config/api";

interface AuthContextType {
  token: string | null;
  email: string | null;
  onboarding: OnboardingStatus | null;
  loading: boolean;
  setAuthData: (token: string, email: string, onboarding: OnboardingStatus) => void;
  refreshOnboarding: () => Promise<OnboardingStatus | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const [email, setEmail] = useState<string | null>(() => sessionStorage.getItem("krypton_email"));
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshOnboarding = useCallback(async (): Promise<OnboardingStatus | null> => {
    if (!getToken()) {
      setLoading(false);
      setOnboarding(null);
      return null;
    }
    try {
      const data = await statusAPI.getOnboarding();
      setOnboarding(data);
      setLoading(false);
      return data;
    } catch {
      clearToken();
      sessionStorage.removeItem("krypton_email");
      setToken(null);
      setEmail(null);
      setOnboarding(null);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshOnboarding();
  }, [refreshOnboarding]);

  const setAuthData = (newToken: string, newEmail: string, newOnboarding: OnboardingStatus) => {
    setToken(newToken);
    setEmail(newEmail);
    sessionStorage.setItem("krypton_email", newEmail);
    setOnboarding(newOnboarding);
  };

  const logout = () => {
    clearToken();
    sessionStorage.removeItem("krypton_email");
    setToken(null);
    setEmail(null);
    setOnboarding(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        email,
        onboarding,
        loading,
        setAuthData,
        refreshOnboarding,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
