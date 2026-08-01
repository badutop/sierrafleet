import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar, { getVisibleNavItems } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDialogHost from "@/components/ui/ConfirmDialogHost";

// Page d'atterrissage dédiée à la connexion pour certains rôles, plutôt que
// leur simple premier module accessible dans l'ordre de la barre latérale.
const ROLE_LANDING_PAGE = {
  responsable_operations: "/campaigns",
  responsable_exploitation: "/fuel",
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Les chauffeurs et les collecteurs de bons ont leur propre page dédiée
    if (currentUser?.role === "chauffeur") {
      navigate("/refuel", { replace: true });
    } else if (currentUser?.role === "collecteur_bons") {
      navigate("/collecte-bons", { replace: true });
    } else if (
      location.pathname === "/" &&
      currentUser &&
      currentUser.role !== "admin" &&
      currentUser.role !== "finances"
    ) {
      // Le Tableau de bord est réservé à Admin et Finances (voir
      // Sidebar.jsx/getVisibleNavItems) — la route elle-même n'a aucune
      // protection, donc un autre rôle atterrissant sur "/" (connexion,
      // lien direct...) est redirigé : vers sa page dédiée si définie
      // (Resp. Opérations -> Campagnes, Resp. Exploitation -> Carburant),
      // sinon vers son premier module réellement accessible.
      const target = ROLE_LANDING_PAGE[currentUser.role]
        || getVisibleNavItems(currentUser).find(item => item.path && item.path !== "/")?.path;
      if (target) navigate(target, { replace: true });
    }
    // L'admin reste sur l'app principale mais peut accéder aux deux directement par leur URL
  }, [currentUser, location.pathname]);

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