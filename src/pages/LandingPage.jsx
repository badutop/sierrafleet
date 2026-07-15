import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Truck, Wrench, Fuel, Ship, BarChart3 } from "lucide-react";

const TRUCK_PHOTO = "/assets/sierratruck.jpeg";
const LOGO = "/assets/sierra-logistics-logo-ptit.png";

const ACTIVITIES = [
  { icon: Truck, label: "Suivi du parc et des chauffeurs" },
  { icon: Wrench, label: "Maintenance préventive et réparations" },
  { icon: Fuel, label: "Carburant et dépenses" },
  { icon: Ship, label: "Planification des campagnes et rotations" },
  { icon: BarChart3, label: "Rapports et indicateurs clairs" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate("/login");

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-slate-950 text-white">
      {/* Background photo */}
      <img
        src={TRUCK_PHOTO}
        alt="Chauffeur Sierra Logistics devant un camion de la flotte"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />

      {/* Content */}
      <div className="relative h-full flex flex-col px-6 sm:px-10 lg:px-16 py-8">
        {/* Header — logo */}
        <div className="flex items-center gap-4 mb-8 sm:mb-10">
          <img
            src={LOGO}
            alt="Sierra Logistics"
            className="h-20 sm:h-24 w-auto rounded-lg bg-white/95 p-2 shadow-lg shrink-0"
          />
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            GOALS
          </h1>
        </div>

        {/* Corps principal */}
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.2] mb-6">
            Gestion des Opérations &amp; Activités Logistiques de Sierra{" "}
            <span className="text-lime-400">(GOALS)</span>
          </h2>

          <ul className="space-y-3 mb-8">
            {ACTIVITIES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-white/80 text-sm sm:text-base">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-lime-500/15 text-lime-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <button
            onClick={handleLogin}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-semibold text-base shadow-lg shadow-lime-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Shield className="w-5 h-5" />
            Accéder à mon espace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-white/35 text-xs mt-auto pt-8">
          © {new Date().getFullYear()} Sierra Logistics — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
