import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Truck, BookOpen, Fuel, Wrench, 
  Users, BarChart3, Settings, ChevronLeft, ChevronRight,
  Package, Receipt, UserCog, Ship, Building2, Factory, Navigation, Zap, LogOut, AlertTriangle, ScrollText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/",            label: "Tableau de bord",          icon: LayoutDashboard, module: "dashboard" },
  { path: "/clients",     label: "Clients",                  icon: Building2,       module: "campaigns" },
  { path: "/suppliers",   label: "Fournisseurs",             icon: Factory,         module: "suppliers" },
  { path: "/drivers",     label: "Chauffeurs",               icon: Users,           module: "drivers" },
  { path: "/vehicles",    label: "Parc Véhicules",           icon: Truck,           module: "vehicles" },
  { path: "/spare-parts", label: "Pièces Détachées",         icon: Package,         module: "spare-parts" },
  { path: "/campaigns",   label: "Campagnes",                icon: Ship,            module: "campaigns" },
  { path: "/fuel",        label: "Carburant",                icon: Fuel,            module: "fuel" },
  { path: "/refuel",      label: "  Rechargement Auto",      icon: Zap,             module: "refuel" },
  { path: "/maintenance", label: "Maintenance",              icon: Wrench,          module: "maintenance" },
  { path: "/repairs",     label: "Réparations",              icon: AlertTriangle,   module: "repairs" },
  { path: "/expenses",    label: "Frais",                    icon: Receipt,         module: "expenses" },
  { path: "/journal",     label: "Journal des Dépenses",     icon: BookOpen,        module: "journal" },
  { path: "/reports",     label: "Rapports",                 icon: BarChart3,       module: "reports" },
  { path: "/gps",         label: "GPS Tracking",             icon: Navigation,      module: "gps" },
  { path: "/users",       label: "Utilisateurs",             icon: UserCog,         module: "users" },
  { path: "/audit-log",   label: "Journal d'Audit",          icon: ScrollText,      module: "audit-log" },
  { path: "/settings",    label: "Paramètres",               icon: Settings,        module: "settings" },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, currentUser }) {
  const location = useLocation();
  const { logout } = useAuth();

  // Admin = accès total. Sinon on filtre sur les modules autorisés.
  const visibleItems = !currentUser || currentUser.role === "admin" || !currentUser.modules?.length
    ? navItems
    : navItems.filter(item => currentUser.modules.includes(item.module));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={cn(
        "fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className={cn("flex items-center h-16 px-3 border-b border-sidebar-border", collapsed ? "justify-center" : "justify-start")}>
          {collapsed ? (
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1">
              <img src="https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png" alt="Sierra Logistics" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="bg-white rounded-xl px-3 py-1.5">
              <img src="https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png" alt="Sierra Logistics" className="h-10 object-contain" />
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleItems.map(item => {
            const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                <item.icon className={cn("w-5 h-5 shrink-0", active && "drop-shadow-sm")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 mx-2 mb-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            "text-sidebar-foreground/60 hover:bg-red-500/15 hover:text-red-400",
            collapsed && "justify-center"
          )}
          title="Se déconnecter"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}