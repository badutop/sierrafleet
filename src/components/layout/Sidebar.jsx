import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Truck, BookOpen, Fuel, Wrench,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight,
  Package, Receipt, UserCog, Ship, Building2, Factory,
  Navigation, Zap, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

/* ── Structure de navigation groupée ── */
const navGroups = [
  {
    label: "Principal",
    items: [
      { path: "/",          label: "Tableau de bord", icon: LayoutDashboard, module: "dashboard" },
      { path: "/campaigns", label: "Campagnes",        icon: Ship,            module: "campaigns",    badge: "3" },
      { path: "/vehicles",  label: "Parc Véhicules",   icon: Truck,           module: "vehicles" },
      { path: "/drivers",   label: "Chauffeurs",        icon: Users,           module: "drivers" },
      { path: "/clients",   label: "Clients",           icon: Building2,       module: "campaigns" },
    ],
  },
  {
    label: "Opérations",
    items: [
      { path: "/fuel",        label: "Carburant",               icon: Fuel,    module: "fuel" },
      { path: "/refuel",      label: "Rechargement Auto",        icon: Zap,     module: "refuel" },
      { path: "/maintenance", label: "Maintenance",              icon: Wrench,  module: "maintenance", badge: "5" },
      { path: "/expenses",    label: "Frais",                    icon: Receipt, module: "expenses" },
      { path: "/spare-parts", label: "Pièces Détachées",         icon: Package, module: "spare-parts" },
      { path: "/suppliers",   label: "Fournisseurs",             icon: Factory, module: "suppliers" },
    ],
  },
  {
    label: "Analytique",
    items: [
      { path: "/journal",  label: "Journal des Dépenses", icon: BookOpen,   module: "journal" },
      { path: "/reports",  label: "Rapports",              icon: BarChart3,  module: "reports" },
      { path: "/gps",      label: "GPS Tracking",          icon: Navigation, module: "gps" },
    ],
  },
  {
    label: "Admin",
    items: [
      { path: "/users",    label: "Utilisateurs", icon: UserCog, module: "users" },
      { path: "/settings", label: "Paramètres",   icon: Settings, module: "settings" },
    ],
  },
];

/* Aplatit tous les items pour le filtrage par module */
const allItems = navGroups.flatMap(g => g.items);

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, currentUser }) {
  const location = useLocation();
  const { logout } = useAuth();

  /* Admin = accès total. Sinon filtre sur les modules autorisés. */
  const allowedModules =
    !currentUser || currentUser.role === "admin" || !currentUser.modules?.length
      ? null
      : new Set(currentUser.modules);

  const isVisible = (item) => !allowedModules || allowedModules.has(item.module);

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out",
          "bg-sidebar border-r border-sidebar-border",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ── Logo ── */}
        <div
          className={cn(
            "flex items-center gap-3 h-16 px-4 border-b border-sidebar-border flex-shrink-0",
            collapsed && "justify-center px-0"
          )}
        >
          {/* Icône logo toujours visible */}
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-lg">
            <img
              src="https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png"
              alt="Sierra Logistics"
              className="w-6 h-6 object-contain"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>

          {/* Nom de l'app — masqué en mode réduit */}
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground leading-none tracking-wide">
                Sierra
              </p>
              <p className="text-[10px] font-semibold text-sidebar-primary uppercase tracking-[1.4px] mt-0.5">
                Fleet Flow
              </p>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(isVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                {/* Label de groupe — masqué en mode réduit */}
                {!collapsed && (
                  <p className="px-3 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-[1.6px] text-sidebar-foreground/35 select-none">
                    {group.label}
                  </p>
                )}
                {collapsed && <div className="my-1.5 mx-3 border-t border-sidebar-border/50" />}

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active =
                      location.pathname === item.path ||
                      (item.path !== "/" && location.pathname.startsWith(item.path + "/"));

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-sidebar-primary/12 text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        {/* Barre active verticale */}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
                        )}

                        <item.icon
                          className={cn(
                            "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                            active
                              ? "text-sidebar-primary"
                              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                          )}
                        />

                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground leading-none">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}

                        {/* Badge visible en mode réduit (point) */}
                        {collapsed && item.badge && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-sidebar-border px-2 py-2 space-y-0.5">
          <button
            onClick={logout}
            title={collapsed ? "Déconnexion" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
              "text-sidebar-foreground/40 hover:bg-red-500/10 hover:text-red-400",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>

          {/* Bouton collapse (desktop uniquement) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-2 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>
    </>
  );
}