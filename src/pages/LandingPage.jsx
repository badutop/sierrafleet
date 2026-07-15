import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";

const TRUCK_PHOTO = "/assets/sierratruck.jpeg";
const LOGO = "/assets/sierra-logistics-logo-ptit.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Email ou mot de passe invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-black">
      {/* Panneau gauche — présentation */}
      <div className="relative flex-1 min-h-[40vh] lg:min-h-screen overflow-hidden text-white">
        <img
          src={TRUCK_PHOTO}
          alt="Chauffeur Sierra Logistics devant un camion de la flotte"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

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
          <div className="max-w-2xl py-8 lg:py-0">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-5">
              Gérez votre flotte
              <br />
              <span className="text-lime-400">en toute simplicité</span>
            </h2>
            <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-xl">
              GOALS centralise le suivi de vos véhicules et chauffeurs, la
              maintenance préventive, le carburant et les dépenses, ainsi que
              la planification des campagnes et rotations — avec des rapports
              et indicateurs clairs pour piloter votre activité au quotidien.
            </p>
          </div>

          {/* Footer */}
          <p className="text-white/35 text-xs hidden lg:block">
            © {new Date().getFullYear()} Sierra Logistics — Tous droits réservés
          </p>
        </div>
      </div>

      {/* Panneau droit — connexion, toujours visible */}
      <div className="flex items-center justify-center bg-background px-6 py-10 sm:py-14 lg:w-[440px] lg:shrink-0">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-lime-500 mb-4">
              <LogIn className="w-7 h-7 text-black" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Bon retour</h2>
            <p className="text-muted-foreground mt-2">Connectez-vous à votre compte</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-medium bg-lime-500 hover:bg-lime-400 text-black"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/forgot-password" className="text-lime-600 font-medium hover:underline">
              Mot de passe oublié ?
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/60 mt-8 lg:hidden">
            © {new Date().getFullYear()} Sierra Logistics — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
