import { Link } from "react-router-dom";
import { Zap, AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-['Rajdhani'] tracking-wider">404 - PAGE NOT FOUND</h1>
          <p className="text-sm text-muted-foreground">
            The page or route you are looking for does not exist or has been moved.
          </p>
        </div>

        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-sm rounded-lg hover:bg-primary/90 transition-all shadow-md"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
