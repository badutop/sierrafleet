import React from "react";
import { base44 } from "@/api/base44Client";
import { Truck, Shield, BarChart2, Clock } from "lucide-react";

const TRUCK_BG = "https://media.base44.com/images/public/69f9299ed58f49c27c655c94/c2a4fdb78_generated_image.png";

const features = [
  { icon: Truck, label: "Gestion de flotte", desc: "Suivi en temps réel de tous vos véhicules" },
  { icon: Shield, label: "Maintenance", desc: "Alertes préventives et historique complet" },
  { icon: BarChart2, label: "Rapports", desc: "Tableaux de bord et indicateurs KPI" },
  { icon: Clock, label: "Campagnes", desc: "Planification et suivi des rotations" },
];

export default function LandingPage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + "/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative flex-1 flex flex-col min-h-screen">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${TRUCK_BG}')` }}
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Top nav bar */}
          <header className="px-8 py-6 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-xl tracking-wide">Sierra</span>
                <span className="text-orange-400 font-bold text-xl tracking-wide ml-1">Logistics</span>
              </div>
            </div>

            {/* Login button top right */}
            <button
              onClick={handleLogin}
              className="hidden sm:block px-5 py-2 rounded-lg border border-white/30 text-white text-sm font-medium backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              Se connecter
            </button>
          </header>

          {/* Hero content — centered */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                Plateforme de gestion logistique
              </div>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
                Sierra{" "}
                <span className="text-orange-400">Logistics</span>
              </h1>

              <p className="text-lg sm:text-xl text-white/70 mb-12 max-w-xl mx-auto leading-relaxed">
                Gérez votre flotte, vos chauffeurs, vos campagnes et vos dépenses depuis une seule plateforme centralisée.
              </p>

              {/* CTA Button */}
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg shadow-2xl shadow-orange-500/40 transition-all hover:scale-105 active:scale-95"
              >
                <Shield className="w-5 h-5" />
                Accéder à la plateforme
              </button>

              <p className="text-white/40 text-sm mt-4">Authentification sécurisée requise</p>
            </div>
          </div>

          {/* Feature cards at the bottom */}
          <div className="relative z-10 px-6 pb-10">
            <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
              {features.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="bg-white/8 backdrop-blur-md border border-white/15 rounded-xl p-4 text-center hover:bg-white/12 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <p className="text-white font-semibold text-sm mb-1">{label}</p>
                  <p className="text-white/50 text-xs leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="relative z-10 py-4 text-center text-white/30 text-xs border-t border-white/10">
            © {new Date().getFullYear()} Sierra Logistics — Tous droits réservés
          </footer>
        </div>
      </div>
    </div>
  );
}