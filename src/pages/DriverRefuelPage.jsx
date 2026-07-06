import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Truck, User, LogOut, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AutoRefuelFlow from "@/components/fuel/auto/AutoRefuelFlow";
import { toast } from "sonner";
import ConfirmDialogHost from "@/components/ui/ConfirmDialogHost";

/**
 * Page dédiée aux chauffeurs — accès unique au module Rechargement Auto.
 * Le chauffeur est identifié via son compte (driver_id stocké sur l'User),
 * son véhicule est récupéré depuis l'entité Vehicle (driver_id).
 */
export default function DriverRefuelPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [allRotations, setAllRotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flowOpen, setFlowOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [user, drivers, vehicles, rotations] = await Promise.all([
        base44.auth.me(),
        base44.entities.Driver.list(),
        base44.entities.Vehicle.list(),
        base44.entities.Rotation.list("-date_rotation", 500),
      ]);
      setCurrentUser(user);
      setAllDrivers(drivers);
      setAllVehicles(vehicles);
      setAllRotations(rotations);

      // Trouver le driver lié à cet utilisateur (chauffeur normal)
      if (user.driver_id) {
        const d = drivers.find(d => d.id === user.driver_id);
        setDriver(d || null);
        if (d) {
          const v = vehicles.find(v => v.driver_id === d.id);
          setVehicle(v || null);
        }
      }
      // Admin : pas de driver_id, il choisira manuellement
    } catch (err) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => base44.auth.logout();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-primary flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png"
            alt="Sierra Logistics"
            className="h-8 object-contain bg-white rounded-lg px-1"
          />
        </div>
        <button onClick={handleLogout} className="text-primary-foreground/70 hover:text-primary-foreground p-2">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Carte chauffeur / véhicule */}
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-xl font-bold">Rechargement Carburant</h1>
            <p className="text-sm text-muted-foreground mt-1">Module chauffeur</p>
          </div>

          {/* Sélection manuelle pour admin, infos fixes pour chauffeur */}
          {currentUser?.role === 'admin' ? (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Chauffeur</p>
                <Select
                  value={driver?.id || ""}
                  onValueChange={(id) => {
                    const d = allDrivers.find(x => x.id === id);
                    setDriver(d || null);
                    const v = d ? allVehicles.find(v => v.driver_id === d.id) : null;
                    setVehicle(v || null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un chauffeur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allDrivers.filter(d => d.statut !== "inactif").map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {driver && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Véhicule assigné</p>
                  {vehicle ? (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-secondary" />
                      <span className="font-bold font-mono">{vehicle.immatriculation}</span>
                      {vehicle.code_camion && <span className="text-xs text-muted-foreground">— {vehicle.code_camion}</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">Aucun véhicule assigné à ce chauffeur</p>
                  )}
                </div>
              )}
            </div>
          ) : driver ? (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chauffeur</p>
                  <p className="font-bold text-base">{driver.prenom} {driver.nom}</p>
                </div>
              </div>
              {vehicle ? (
                <div className="flex items-center gap-3 border-t pt-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Véhicule assigné</p>
                    <p className="font-bold text-base font-mono">{vehicle.immatriculation}</p>
                    {vehicle.code_camion && (
                      <p className="text-xs text-muted-foreground">{vehicle.code_camion} — {vehicle.marque} {vehicle.modele}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Aucun véhicule assigné à ce chauffeur
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-semibold text-amber-800">Compte non lié à un chauffeur</p>
              <p className="text-xs text-amber-700">
                Demandez à votre administrateur de lier ce compte à votre profil chauffeur.
              </p>
            </div>
          )}

          {/* Bouton principal */}
          <Button
            className="w-full h-14 text-base font-bold bg-secondary hover:bg-secondary/90 text-white rounded-2xl"
            disabled={!driver || !vehicle}
            onClick={() => setFlowOpen(true)}
          >
            <Zap className="w-5 h-5 mr-2" />
            Démarrer un rechargement
          </Button>
        </div>
      </main>

      {/* Flow rechargement */}
      {flowOpen && driver && vehicle && (
        <AutoRefuelFlow
          drivers={allDrivers}
          vehicles={allVehicles}
          rotations={allRotations}
          preselectedDriver={driver}
          preselectedVehicle={vehicle}
          onClose={() => {
            setFlowOpen(false);
            loadData();
          }}
        />
      )}
      <ConfirmDialogHost />
    </div>
  );
}