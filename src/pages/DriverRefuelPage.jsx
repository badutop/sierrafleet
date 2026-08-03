import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Zap, Truck, User, LogOut, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AutoRefuelFlow from "@/components/fuel/auto/AutoRefuelFlow";
import DriverBonEntryFlow from "@/components/rotations/driver/DriverBonEntryFlow";
import { useAppSetting, isSettingOn } from "@/hooks/use-app-setting";
import { DRIVER_BON_ENTRY_KEY } from "@/lib/driverBonEntry";
import { toast } from "sonner";
import ConfirmDialogHost from "@/components/ui/ConfirmDialogHost";

/**
 * Page dédiée aux chauffeurs — accès unique au module Rechargement Auto.
 * Le chauffeur est identifié via son compte (driver_id stocké sur le profil),
 * son véhicule est récupéré depuis la table vehicles (driver_id).
 */
export default function DriverRefuelPage() {
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [allRotations, setAllRotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flowOpen, setFlowOpen] = useState(false);
  const [bonFlowOpen, setBonFlowOpen] = useState(false);
  const [pendingCheckpointId, setPendingCheckpointId] = useState(null);

  // Nouveau flux "chauffeur saisit lui-même" (togglable, voir
  // DriverBonEntryToggleCard.jsx dans Paramètres) — additif uniquement :
  // si le réglage est OFF, aucune requête supplémentaire n'est faite et le
  // reste de cette page se comporte exactement comme avant.
  const { data: bonEntrySetting } = useAppSetting(DRIVER_BON_ENTRY_KEY);
  const bonEntryActive = isSettingOn(bonEntrySetting);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", vehicle?.campaign_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", vehicle.campaign_id).single();
      if (error) throw error;
      return data;
    },
    enabled: bonEntryActive && !!vehicle?.campaign_id,
  });
  const { data: campaignClientRows = [] } = useQuery({
    queryKey: ["campaign_clients", vehicle?.campaign_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_clients").select("*").eq("campaign_id", vehicle.campaign_id);
      if (error) throw error;
      return data;
    },
    enabled: bonEntryActive && !!vehicle?.campaign_id,
  });
  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return data;
    },
    enabled: bonEntryActive,
  });
  const { data: zones = [] } = useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("zones").select("*");
      if (error) throw error;
      return data;
    },
    enabled: bonEntryActive,
  });
  // Même repli que CampaignDetail.jsx : les campagnes créées avant le
  // multi-clients n'ont pas de ligne campaign_clients, juste campaign.client_id.
  const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));
  const campaignClients = campaignClientRows.length
    ? campaignClientRows.map(cc => ({ client_id: cc.client_id, tonnage_prevu: cc.tonnage_prevu, client: clientMap[cc.client_id] }))
    : (campaign?.client_id ? [{ client_id: campaign.client_id, tonnage_prevu: campaign.tonnage_total_prevu, client: clientMap[campaign.client_id] }] : []);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      const [
        { data: drivers, error: driversError },
        { data: vehicles, error: vehiclesError },
        { data: rotations, error: rotationsError },
      ] = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("rotations").select("*").order("date_rotation", { ascending: false }).limit(500),
      ]);
      if (driversError) throw driversError;
      if (vehiclesError) throw vehiclesError;
      if (rotationsError) throw rotationsError;
      setAllDrivers(drivers);
      setAllVehicles(vehicles);
      setAllRotations(rotations);

      // Trouver le driver lié à cet utilisateur (chauffeur normal)
      if (currentUser?.driver_id) {
        const d = drivers.find(d => d.id === currentUser.driver_id);
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

  const handleLogout = () => logout();

  if (loading) {
    return (
      <div className="min-h-viewport bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-viewport bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-primary flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img
            src="/assets/sierra-logistics-logo.png"
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

          {/* Sélection manuelle si pas de chauffeur lié au compte, sinon infos fixes */}
          {!driver ? (
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
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">Aucun véhicule assigné à ce chauffeur</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {driver.photo_url ? (
                    <img src={driver.photo_url} alt={`${driver.prenom} ${driver.nom}`} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
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
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Aucun véhicule assigné à ce chauffeur
                </div>
              )}
            </div>
          )}

          {/* Nouveau flux (togglable) : boutons en photos plutôt qu'en texte —
              beaucoup de chauffeurs lisent/écrivent peu, l'image (pont-bascule,
              pompe) doit suffire à reconnaître l'action sans avoir à lire le
              libellé. */}
          {bonEntryActive ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!driver || !vehicle || !vehicle?.campaign_id}
                onClick={() => setBonFlowOpen(true)}
                className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-secondary/50 bg-secondary/5 overflow-hidden active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
              >
                <img src="/assets/pont-bascule.jpeg" alt="Bon d'enlèvement" className="w-14 h-14 rounded-xl object-cover" />
                <span className="text-xs font-bold text-secondary">Bon d'enlèvement</span>
              </button>
              <button
                type="button"
                disabled={!driver || !vehicle}
                onClick={() => setFlowOpen(true)}
                className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl bg-secondary overflow-hidden active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
              >
                <img src="/assets/pompe.jpeg" alt="Rechargement" className="w-14 h-14 rounded-xl object-cover" />
                <span className="text-xs font-bold text-white">Rechargement</span>
              </button>
            </div>
          ) : (
            <Button
              className="w-full h-14 text-base font-bold bg-secondary hover:bg-secondary/90 text-white rounded-2xl"
              disabled={!driver || !vehicle}
              onClick={() => setFlowOpen(true)}
            >
              <Zap className="w-5 h-5 mr-2" />
              Démarrer un rechargement
            </Button>
          )}
          {bonEntryActive && driver && vehicle && !vehicle.campaign_id && (
            <p className="text-xs text-amber-600 text-center -mt-2">Véhicule non affecté à une campagne en cours</p>
          )}
        </div>
      </main>

      {/* Nouveau flux : scan + saisie du bon d'enlèvement par le chauffeur */}
      {bonFlowOpen && driver && vehicle && campaign && (
        <DriverBonEntryFlow
          driver={driver}
          vehicle={vehicle}
          campaign={campaign}
          campaignClients={campaignClients}
          zones={zones}
          onClose={() => setBonFlowOpen(false)}
          onSaved={({ checkpointRotationId }) => {
            setBonFlowOpen(false);
            loadData();
            // DriverBonEntryFlow lit désormais rotations/campaign en direct
            // depuis la DB au moment de la confirmation (voir son
            // handleConfirm) plutôt que depuis ce cache react-query — évite
            // tout risque de compte périmé d'un scan à l'autre. On invalide
            // quand même ces clés pour que les autres écrans (Carburant,
            // Campagnes > Rotations) reflètent ce nouveau bon sans attendre
            // leur prochain remount.
            queryClient.invalidateQueries({ queryKey: ["rotations", vehicle.campaign_id] });
            queryClient.invalidateQueries({ queryKey: ["campaign", vehicle.campaign_id] });
            // Le refuel vient d'être validé automatiquement (3e bon) : on
            // enchaîne directement sur la pompe via le checkpointRotationId,
            // qu'AutoRefuelFlow (strictement inchangé) sait déjà interpréter
            // pour sauter le scan/récap des bons — superflu ici, déjà faits.
            if (checkpointRotationId) {
              setPendingCheckpointId(checkpointRotationId);
              setFlowOpen(true);
            }
          }}
        />
      )}

      {/* Flow rechargement */}
      {flowOpen && driver && vehicle && (
        <AutoRefuelFlow
          drivers={allDrivers}
          vehicles={allVehicles}
          rotations={allRotations}
          preselectedDriver={driver}
          preselectedVehicle={vehicle}
          checkpointRotationId={pendingCheckpointId}
          onClose={() => {
            setFlowOpen(false);
            setPendingCheckpointId(null);
            loadData();
          }}
        />
      )}
      <ConfirmDialogHost />
    </div>
  );
}