import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Zap, Newspaper, Activity, LayoutDashboard, LogOut, Settings, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { llmKeyAPI, type LLMKeyStatus } from "../config/api";

export default function Header() {
  const { email, onboarding, logout } = useAuth();
  const [llmStatus, setLlmStatus] = useState<LLMKeyStatus | null>(null);

  useEffect(() => {
    llmKeyAPI.getStatus().then(setLlmStatus).catch(() => {});
  }, []);

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Krypton Brand Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap size={11} className="text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-['Rajdhani'] text-base font-bold tracking-widest text-foreground uppercase">
            KRYPTON
          </span>
        </NavLink>

        <div className="h-4 w-px bg-border" />

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-lg border border-border">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            <LayoutDashboard size={12} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/news"
            className={({ isActive }) =>
              `px-3 py-1 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            <Newspaper size={12} className="text-emerald-400" />
            <span>News & Sentiment</span>
          </NavLink>

          <NavLink
            to="/indicators"
            className={({ isActive }) =>
              `px-3 py-1 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            <Activity size={12} className="text-purple-400" />
            <span>Indicators</span>
          </NavLink>
        </nav>
      </div>

      {/* User Info & Status Badges */}
      <div className="flex items-center gap-3">
        {email && (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="text-foreground/60">{email}</span>
          </div>
        )}

        <button
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell size={13} />
        </button>

        <button
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings size={13} />
        </button>

        {/* AI Key Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-border rounded-md">
          <span className="text-xs font-mono text-muted-foreground">AI:</span>
          <span className="text-xs font-mono text-foreground capitalize">
            {llmStatus ? llmStatus.provider : "Not set"}
          </span>
        </div>

        {/* Binance Connection Badge */}
        {onboarding?.binance_connected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md">
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span className="text-xs font-mono text-primary">Binance</span>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={logout}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-1"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
