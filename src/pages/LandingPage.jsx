import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";

const TRUCK_PHOTO = "/assets/sierratruck.jpeg";
const LOGO = "/assets/sierra-logistics-logo-ptit.png";

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
      <div className="relative h-full flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-8">
        {/* Header — logo + nom de l'app */}
        <div className="flex items-center gap-4">
          <img
            src={LOGO}
            alt="Sierra Logistics"
            className="h-12 sm:h-14 w-auto rounded-lg bg-white/95 p-1.5 shadow-lg shrink-0"
          />
          <div className="leading-tight">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              GOALS
            </h1>
            <p className="text-white/60 text-xs sm:text-sm">
              Gestion des Opérations &amp; Activités Logistiques de Sierra
            </p>
          </div>
        </div>

        {/* Corps principal */}
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-5">
            Gérez votre flotte
            <br />
            <span className="text-orange-400">en toute simplicité</span>
          </h2>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-8 max-w-xl">
            GOALS centralise le suivi de vos véhicules et chauffeurs, la
            maintenance préventive, le carburant et les dépenses, ainsi que
            la planification des campagnes et rotations — avec des rapports
            et indicateurs clairs pour piloter votre activité au quotidien.
          </p>

          <button
            onClick={handleLogin}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-base shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Shield className="w-5 h-5" />
            Accéder à mon espace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-white/35 text-xs">
          © {new Date().getFullYear()} Sierra Logistics — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
