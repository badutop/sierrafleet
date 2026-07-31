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
    // Les chauffeurs et les collecteurs de bons ont leur propre page dédiée
    if (currentUser?.role === "chauffeur") {
      navigate("/refuel", { replace: true });
    } else if (currentUser?.role === "collecteur_bons") {
      navigate("/collecte-bons", { replace: true });
    }
    // L'admin reste sur l'app principale mais peut accéder aux deux directement par leur URL
  }, [currentUser]);

  return (
    <div className="min-h-viewport bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        currentUser={currentUser}
      />
      <div className={cn(
        "transition-all duration-300 ease-in-out min-h-viewport flex flex-col",
        collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
      )}>
        <header className="sticky top-0 z-30 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 lg:px-6 gap-3 shrink-0">
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
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
        <footer className="min-h-12 bg-sidebar border-t border-sidebar-border flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-sidebar-foreground/80">Powered by</span>
            <img src="/assets/smartek.png" alt="SmarTEK" className="h-5 w-auto object-contain brightness-0 invert" />
          </div>
          <span className="text-sidebar-foreground/30 text-xs hidden sm:inline">·</span>
          <span className="text-[11px] text-sidebar-foreground/50">© {new Date().getFullYear()} Sierra Logistics — Tous droits réservés</span>
        </footer>
      </div>
      <ConfirmDialogHost />
    </div>
  );
}