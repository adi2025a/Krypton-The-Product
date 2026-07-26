import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AppLayout from "../layouts/AppLayout";
import AuthPage from "../pages/AuthPage";
import LLMSetupPage from "../pages/LLMSetupPage";
import BinanceSetupPage from "../pages/BinanceSetupPage";
import DashboardPage from "../pages/DashboardPage";
import NewsPage from "../pages/NewsPage";
import IndicatorsPage from "../pages/IndicatorsPage";
import NotFoundPage from "../pages/NotFoundPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* Onboarding setup routes */}
      <Route element={<ProtectedRoute requireOnboarding={false} />}>
        <Route path="/setup/llm" element={<LLMSetupPage />} />
        <Route path="/setup/binance" element={<BinanceSetupPage />} />
      </Route>

      {/* Main protected application shell */}
      <Route element={<ProtectedRoute requireOnboarding={true} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/indicators" element={<IndicatorsPage />} />
        </Route>
      </Route>

      {/* Catch-all 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
