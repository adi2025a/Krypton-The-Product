import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  requireOnboarding?: boolean;
}

export default function ProtectedRoute({ requireOnboarding = true }: ProtectedRouteProps) {
  const { token, onboarding, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>Loading Krypton...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (requireOnboarding && onboarding && !onboarding.llm_key_set) {
    return <Navigate to="/setup/llm" replace />;
  }

  return <Outlet />;
}
