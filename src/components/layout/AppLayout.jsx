import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDialogHost from "@/components/ui/ConfirmDialogHost";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Les chauffeurs ont leur propre page dédiée
    if (currentUser?.role === "chauffeur") {
      navigate("/refuel", { replace: true });
    }
    // L'admin reste sur l'app principale mais peut accéder à /refuel via le menu carburant
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        currentUser={currentUser}
      />
      <div className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
      )}>
        <header className="sticky top-0 z-30 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 lg:px-6 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <p className="flex-1 text-center text-xs sm:text-sm font-semibold tracking-wide truncate text-sidebar-foreground">
            Gestion des Opérations &amp; Activités{" "}
            <span className="text-sidebar-primary">Logistiques de Sierra</span>
          </p>
          <span className="shrink-0 text-[11px] font-mono font-semibold text-sidebar-primary">v1.0</span>
        </header>
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <ConfirmDialogHost />
    </div>
  );
}