import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import ChatOverlay from "../components/ChatOverlay";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <ChatOverlay />
    </div>
  );
}
