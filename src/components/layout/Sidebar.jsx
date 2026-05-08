import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Truck, BookOpen, Fuel, Wrench, 
  Users, BarChart3, Settings, ChevronLeft, ChevronRight,
  Package, Receipt, UserCog, Ship, Building2, Factory, Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { path: "/drivers", label: "Chauffeurs", icon: Users },
  { path: "/vehicles", label: "Parc Véhicules", icon: Truck },
  { path: "/clients", label: "Clients", icon: Building2 },
  { path: "/suppliers", label: "Fournisseurs", icon: Factory },
  { path: "/spare-parts", label: "Pièces Détachées", icon: Package },
  { path: "/expenses", label: "Frais", icon: Receipt },
  { path: "/campaigns", label: "Campagnes", icon: Ship },
  { path: "/gps", label: "GPS Tracking", icon: Navigation },
  { path: "/fuel", label: "Carburant", icon: Fuel },
  { path: "/maintenance", label: "Maintenance & Réparations", icon: Wrench },
  { path: "/journal", label: "Journal des Dépenses", icon: BookOpen },
  { path: "/reports", label: "Rapports", icon: BarChart3 },
  { path: "/users", label: "Utilisateurs", icon: UserCog },
  { path: "/settings", label: "Paramètres", icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();

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
        <div className={cn("flex items-center h-16 px-3 border-b border-sidebar-border", collapsed ? "justify-center" : "justify-center")}>
          {collapsed ? (
            <img src="https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png" alt="Sierra Logistics" className="w-10 h-10 object-contain" />
          ) : (
            <img src="https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png" alt="Sierra Logistics" className="h-12 object-contain" />
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
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