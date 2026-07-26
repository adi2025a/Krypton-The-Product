import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import type { User, LLMKeyStatus, BinanceStatus } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showLLMSetup: boolean;
  setShowLLMSetup: (show: boolean) => void;
  showBinanceSetup: boolean;
  setShowBinanceSetup: (show: boolean) => void;
  llmStatus: LLMKeyStatus | null;
  binanceStatus: BinanceStatus | null;
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<string>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<string>;
  setLLMKey: (provider: string, modelName: string, apiKey: string) => Promise<void>;
  connectBinance: (apiKey: string, apiSecret: string) => Promise<void>;
  logout: () => void;
  refreshStatuses: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('krypton_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('krypton_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLLMSetup, setShowLLMSetup] = useState<boolean>(false);
  const [showBinanceSetup, setShowBinanceSetup] = useState<boolean>(false);
  const [llmStatus, setLlmStatus] = useState<LLMKeyStatus | null>(null);
  const [binanceStatus, setBinanceStatus] = useState<BinanceStatus | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT');

  const refreshStatuses = useCallback(async () => {
    if (!token) {
      setLlmStatus(null);
      setBinanceStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      const llmRes = await apiClient.get<LLMKeyStatus>('/llm-key/status').catch(() => null);
      if (llmRes?.data) {
        setLlmStatus(llmRes.data);
      } else {
        setLlmStatus(null);
      }

      const binanceRes = await apiClient.get<BinanceStatus>('/integration/binance/status').catch(() => null);
      if (binanceRes?.data) {
        setBinanceStatus(binanceRes.data);
      } else {
        setBinanceStatus(null);
      }
    } catch (err) {
      console.error('Error fetching integration statuses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
    const newToken = response.data.access_token;
    const userData: User = { email, is_verified: true };

    setToken(newToken);
    setUser(userData);
    localStorage.setItem('krypton_token', newToken);
    localStorage.setItem('krypton_user', JSON.stringify(userData));

    try {
      const llmRes = await apiClient.get<LLMKeyStatus>('/llm-key/status', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setLlmStatus(llmRes.data);
    } catch {
      setLlmStatus(null);
      setShowLLMSetup(true);
    }

    try {
      const binanceRes = await apiClient.get<BinanceStatus>('/integration/binance/status', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setBinanceStatus(binanceRes.data);
    } catch {
      setBinanceStatus(null);
    }
  };

  const signup = async (email: string, password: string): Promise<string> => {
    const res = await apiClient.post<{ message: string }>('/auth/signup', { email, password });
    return res.data.message;
  };

  const verifyOtp = async (email: string, otp: string) => {
    await apiClient.post<{ message: string }>('/auth/verify-otp', { email, otp });
  };

  const resendOtp = async (email: string): Promise<string> => {
    const res = await apiClient.post<{ message: string }>('/auth/resend-otp', { email });
    return res.data.message;
  };

  const setLLMKey = async (provider: string, modelName: string, apiKey: string) => {
    const res = await apiClient.post<LLMKeyStatus>('/llm-key/set', {
      provider,
      model_name: modelName,
      api_key: apiKey,
    });
    setLlmStatus(res.data);
    setShowLLMSetup(false);
  };

  const connectBinance = async (apiKey: string, apiSecret: string) => {
    const res = await apiClient.post<BinanceStatus>('/integration/binance/connect', {
      api_key: apiKey,
      api_secret: apiSecret,
    });
    setBinanceStatus(res.data);
    setShowBinanceSetup(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setLlmStatus(null);
    setBinanceStatus(null);
    setShowLLMSetup(false);
    setShowBinanceSetup(false);
    localStorage.removeItem('krypton_token');
    localStorage.removeItem('krypton_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        showLLMSetup,
        setShowLLMSetup,
        showBinanceSetup,
        setShowBinanceSetup,
        llmStatus,
        binanceStatus,
        activeSymbol,
        setActiveSymbol,
        login,
        signup,
        verifyOtp,
        resendOtp,
        setLLMKey,
        connectBinance,
        logout,
        refreshStatuses,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
