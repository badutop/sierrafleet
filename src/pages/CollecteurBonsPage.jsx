import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut, Fuel, Truck, Camera, ImageIcon, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/storage";
import DocumentScanner from "@/components/drivers/DocumentScanner";
import { logAudit } from "@/lib/auditLog";
import { getCompletedRefuelCheckpoints } from "@/lib/refuelRules";
import ConfirmDialogHost from "@/components/ui/ConfirmDialogHost";

// Une rotation d'un groupe déjà rechargé (voir getCompletedRefuelCheckpoints) :
// bon d'enlèvement (Resp. Opérations) à gauche, bon final (client) à droite —
// à scanner puis comparer. "Écart constaté" reste une appréciation manuelle
// du collecteur (les bons sont des photos, pas de l'OCR), avec une note libre.
function RotationBonRow({ rotation, onScan, onToggleEcart, onSaveObservation }) {
  const [obs, setObs] = useState(rotation.observation_bon_final || "");
  const hasUnsavedObs = obs !== (rotation.observation_bon_final || "");

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold">Rotation #{rotation.numero_rotation}</span>
        <span className="text-muted-foreground">
          {Number(rotation.poids_charge_tonnes || 0).toFixed(2)} T{rotation.numero_bon_client ? ` · BL ${rotation.numero_bon_client}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Bon (Resp. Opérations)</p>
          {rotation.bon_physique_scan_url ? (
            <button type="button" onClick={() => window.open(rotation.bon_physique_scan_url, "_blank")} className="block w-full">
              <img src={rotation.bon_physique_scan_url} alt="Bon d'enlèvement" className="w-full h-20 object-cover rounded border border-border" />
            </button>
          ) : (
            <div className="w-full h-20 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-5 h-5 opacity-40" />
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Bon final (client)</p>
          {rotation.bon_final_scan_url ? (
            <button type="button" onClick={() => window.open(rotation.bon_final_scan_url, "_blank")} className="block w-full">
              <img src={rotation.bon_final_scan_url} alt="Bon final" className="w-full h-20 object-cover rounded border-2 border-emerald-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onScan}
              className="w-full h-20 rounded border-2 border-dashed border-secondary/50 flex flex-col items-center justify-center gap-1 text-secondary hover:bg-secondary/5 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Scanner</span>
            </button>
          )}
        </div>
      </div>

      {rotation.bon_final_scan_url && (
        <div className="pt-2 border-t border-border space-y-1.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={rotation.ecart_bon_final} onCheckedChange={(checked) => onToggleEcart(!!checked)} />
            <span className={rotation.ecart_bon_final ? "text-destructive font-semibold" : "text-muted-foreground"}>
              Écart constaté
            </span>
          </label>
          {rotation.ecart_bon_final && (
            <div className="space-y-1">
              <Textarea
                className="text-xs min-h-[50px]"
                placeholder="Décrire l'écart (poids, numéro de bon...)"
                value={obs}
                onChange={e => setObs(e.target.value)}
              />
              {hasUnsavedObs && (
                <Button size="sm" className="h-7 text-xs" onClick={() => onSaveObservation(obs)}>
                  Enregistrer la note
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Espace dédié au Collecteur de bons — page autonome (comme /refuel pour les
// chauffeurs), sans le menu latéral. Il y voit les transactions déjà
// rechargées (jusqu'à la pompe, voir refuelRules.getCompletedRefuelCheckpoints)
// avec le bon d'enlèvement scanné par le Responsable des Opérations et la
// photo de la pompe prise par le chauffeur, et scanne pour chacune le bon
// final délivré par le client au point de livraison.
export default function CollecteurBonsPage() {
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [scanningRotationId, setScanningRotationId] = useState(null);
  const [tab, setTab] = useState("a_traiter");

  const { data: rotations = [], isLoading } = useQuery({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").order("date_rotation", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: fuelEntries = [] } = useQuery({
    queryKey: ["fuel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_entries").select("*").order("date", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const fuelEntryMap = useMemo(() => Object.fromEntries(fuelEntries.map(f => [f.id, f])), [fuelEntries]);

  const checkpoints = useMemo(() => getCompletedRefuelCheckpoints(rotations), [rotations]);

  const { pending, done } = useMemo(() => {
    const pending = [];
    const done = [];
    checkpoints.forEach(cp => {
      const allCollected = cp.rotations.every(r => r.bon_final_scan_url);
      (allCollected ? done : pending).push(cp);
    });
    pending.sort((a, b) => new Date(a.rotations[0]?.date_rotation || 0) - new Date(b.rotations[0]?.date_rotation || 0));
    done.sort((a, b) => new Date(b.rotations[0]?.date_rotation || 0) - new Date(a.rotations[0]?.date_rotation || 0));
    return { pending, done };
  }, [checkpoints]);

  const ecartCount = useMemo(() => checkpoints.reduce((s, cp) => s + cp.rotations.filter(r => r.ecart_bon_final).length, 0), [checkpoints]);

  const updateRotation = useMutation({
    mutationFn: async ({ id, payload, oldData }) => {
      const { error } = await supabase.from("rotations").update(payload).eq("id", id);
      if (error) throw error;
      await logAudit("Rotation", id, "update", payload, oldData, Object.keys(payload));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rotations"] }),
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const handleScanCapture = async (file) => {
    const rotationId = scanningRotationId;
    setScanningRotationId(null);
    if (!rotationId) return;
    try {
      const { file_url } = await uploadFile(file, "bon-final-scans");
      const oldData = rotations.find(r => r.id === rotationId);
      await updateRotation.mutateAsync({
        id: rotationId,
        payload: {
          bon_final_scan_url: file_url,
          bon_final_collecte_le: new Date().toISOString(),
          bon_final_collecte_par: currentUser?.id || null,
        },
        oldData,
      });
      toast.success("Bon final scanné");
    } catch (err) {
      toast.error(`Erreur lors de l'envoi du scan : ${err.message}`);
    }
  };

  const handleToggleEcart = (rotation, checked) => {
    updateRotation.mutate({
      id: rotation.id,
      payload: { ecart_bon_final: checked, ...(checked ? {} : { observation_bon_final: null }) },
      oldData: rotation,
    });
  };

  const handleSaveObservation = (rotation, text) => {
    updateRotation.mutate({ id: rotation.id, payload: { observation_bon_final: text }, oldData: rotation });
  };

  if (isLoading) {
    return (
      <div className="min-h-viewport bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  const list = tab === "a_traiter" ? pending : done;

  return (
    <div className="min-h-viewport bg-background flex flex-col">
      <header className="h-14 bg-primary flex items-center justify-between px-4 flex-shrink-0">
        <img src="/assets/sierra-logistics-logo.png" alt="Sierra Logistics" className="h-8 object-contain bg-white rounded-lg px-1" />
        <button onClick={logout} className="text-primary-foreground/70 hover:text-primary-foreground p-2">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl w-full mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-secondary" /> Collecte des bons finaux
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pending.length} à traiter · {done.length} terminée{done.length !== 1 ? "s" : ""}
            {ecartCount > 0 && <span className="text-destructive font-semibold"> · {ecartCount} écart{ecartCount !== 1 ? "s" : ""}</span>}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "a_traiter" ? "default" : "outline"}
            className={tab === "a_traiter" ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}
            onClick={() => setTab("a_traiter")}
          >
            À traiter ({pending.length})
          </Button>
          <Button size="sm" variant={tab === "termines" ? "default" : "outline"} onClick={() => setTab("termines")}>
            Terminés ({done.length})
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{tab === "a_traiter" ? "Aucune transaction en attente de collecte" : "Aucune transaction terminée"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(cp => {
              const vehicle = vehicleMap[cp.vehicleId];
              const driver = driverMap[vehicle?.driver_id];
              const client = clientMap[cp.clientId];
              const fuelEntry = fuelEntryMap[cp.fuelEntryId];
              const collectedCount = cp.rotations.filter(r => r.bon_final_scan_url).length;
              return (
                <div key={`${cp.clientId}-${cp.vehicleId}-${cp.fuelEntryId}`} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 flex items-center gap-3 border-b border-border">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm font-mono truncate">{vehicle?.immatriculation || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {driver ? `${driver.prenom} ${driver.nom}` : "Chauffeur inconnu"} · {client?.nom || "Client inconnu"}
                      </p>
                    </div>
                    <Badge className={collectedCount === 3 ? "bg-emerald-500/10 text-emerald-600 text-[10px] shrink-0" : "bg-amber-500/10 text-amber-600 text-[10px] shrink-0"}>
                      {collectedCount}/3 bons
                    </Badge>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Fuel className="w-3 h-3" /> Photo de la pompe (chauffeur)
                      </p>
                      {fuelEntry?.recu_url ? (
                        <button type="button" onClick={() => window.open(fuelEntry.recu_url, "_blank")} className="block">
                          <img src={fuelEntry.recu_url} alt="Photo de la pompe" className="h-28 rounded-lg border border-border object-cover" />
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Aucune photo</p>
                      )}
                    </div>

                    {cp.rotations.map(r => (
                      <RotationBonRow
                        key={r.id}
                        rotation={r}
                        onScan={() => setScanningRotationId(r.id)}
                        onToggleEcart={(checked) => handleToggleEcart(r, checked)}
                        onSaveObservation={(text) => handleSaveObservation(r, text)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {scanningRotationId && (
        <DocumentScanner
          onCapture={handleScanCapture}
          onClose={() => setScanningRotationId(null)}
          instructionText="Alignez le bon final dans le cadre"
        />
      )}
      <ConfirmDialogHost />
    </div>
  );
}
