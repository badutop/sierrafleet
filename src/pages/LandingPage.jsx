import React from "react";
import { base44 } from "@/api/base44Client";
import { Truck, Shield, BarChart2, Clock, ArrowRight, Package, Users } from "lucide-react";

const TRUCK_BG = "https://media.base44.com/images/public/69f9299ed58f49c27c655c94/798922e26_generated_image.png";

const features = [
  { icon: Truck,      label: "Flotte",      desc: "Suivi temps réel" },
  { icon: Shield,     label: "Maintenance", desc: "Alertes préventives" },
  { icon: BarChart2,  label: "Rapports",    desc: "KPIs & analytics" },
  { icon: Package,    label: "Campagnes",   desc: "Gestion rotations" },
  { icon: Clock,      label: "Carburant",   desc: "Consommation & coûts" },
  { icon: Users,      label: "Chauffeurs",  desc: "Dossiers & performances" },
];

export default function LandingPage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + "/");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL — background photo + branding ── */}
      <div className="relative lg:flex-1 min-h-[45vh] lg:min-h-screen overflow-hidden">
        {/* Photo */}
        <img
          src={TRUCK_BG}
          alt="Sierra Logistics fleet"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/40 to-transparent" />
        {/* Bottom fade for mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent lg:hidden" />

        {/* Content on top of photo */}
        <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-600/50">
              <Truck className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-extrabold text-2xl tracking-tight">Sierra</span>
              <span className="text-orange-400 font-extrabold text-2xl tracking-tight -mt-1">Logistics</span>
            </div>
          </div>

          {/* Tagline — hidden on mobile */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Plateforme de gestion logistique
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
              Gérez votre flotte<br />
              <span className="text-orange-400">en toute simplicité</span>
            </h1>
            <p className="text-white/60 text-base max-w-sm leading-relaxed mb-10">
              Centralisez véhicules, chauffeurs, campagnes et dépenses dans une seule plateforme puissante.
            </p>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-2.5 bg-white/8 backdrop-blur-sm border border-white/12 rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/25 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-white/45 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="hidden lg:block text-white/25 text-xs">
            © {new Date().getFullYear()} Sierra Logistics — Tous droits réservés
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login ── */}
      <div className="w-full lg:w-[440px] xl:w-[480px] bg-slate-950 flex flex-col items-center justify-center px-8 py-12 lg:py-0">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white font-extrabold text-xl">Sierra</span>
              <span className="text-orange-400 font-extrabold text-xl ml-1">Logistics</span>
            </div>
          </div>

          {/* Login card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mb-6 mx-auto">
              <Shield className="w-7 h-7 text-orange-400" />
            </div>

            <h2 className="text-white text-2xl font-bold text-center mb-2">Bienvenue</h2>
            <p className="text-slate-400 text-sm text-center mb-8 leading-relaxed">
              Connectez-vous pour accéder à votre espace de gestion logistique
            </p>

            {/* Main CTA */}
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-base shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] active:scale-95 mb-4"
            >
              <Shield className="w-5 h-5" />
              Se connecter
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-600 text-xs">Accès sécurisé</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Info badges */}
            <div className="flex justify-center gap-3 flex-wrap">
              {["Véhicules", "Rotations", "Dépenses", "Rapports"].map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Footer on mobile */}
          <p className="text-center text-slate-600 text-xs mt-6 lg:hidden">
            © {new Date().getFullYear()} Sierra Logistics
          </p>
        </div>
      </div>
    </div>
  );
}