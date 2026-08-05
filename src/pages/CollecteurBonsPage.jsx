import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  LogOut, Fuel, Truck, ImageIcon, ClipboardCheck, Calendar, MapPin, Droplet,
  Coins, Package, Ship, Search, Printer, Clock, CheckCircle, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";
import { getCompletedRefuelCheckpoints } from "@/lib/refuelRules";
import PeriodFilter, { getDateRange, inRange } from "@/components/reports/PeriodFilter";
import ConfirmDialogHost from "@/components/ui/ConfirmDialogHost";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Statut dérivé d'une rotation — bon_final_verifie_le/par (nouvelles colonnes)
// distinguent "pas encore contrôlé" de "contrôlé, sans écart", ce que
// ecart_bon_final seul ne permettait pas (false par défaut dans les deux cas).
function getRotationStatus(r) {
  if (!r.bon_final_scan_url) return "attente_chauffeur";
  if (!r.bon_final_verifie_le) return "a_verifier";
  return r.ecart_bon_final ? "verifie_ecart" : "reconciliation_ok";
}

const STATUS_LABELS = {
  attente_chauffeur: "En attente du chauffeur",
  a_verifier: "À vérifier",
  verifie_ecart: "Vérifié — écart",
  reconciliation_ok: "Réconciliation OK",
};
const STATUS_BADGE_CLASS = {
  attente_chauffeur: "bg-muted text-muted-foreground",
  a_verifier: "bg-amber-500/10 text-amber-600",
  verifie_ecart: "bg-destructive/10 text-destructive",
  reconciliation_ok: "bg-emerald-500/10 text-emerald-600",
};

// Statut d'un checkpoint (groupe de 3 rotations, voir refuelRules.js) =
// agrégat de ses 3 rotations : "Réconciliation OK" seulement si les 3 le
// sont, "Vérifié — écart" si les 3 sont contrôlées et qu'au moins une a un
// écart, sinon "À vérifier" (inclut l'attente du chauffeur).
function getCheckpointStatus(cp) {
  const statuses = cp.rotations.map(getRotationStatus);
  const allControlled = statuses.every(s => s === "reconciliation_ok" || s === "verifie_ecart");
  if (!allControlled) return "a_verifier";
  return statuses.some(s => s === "verifie_ecart") ? "verifie_ecart" : "reconciliation_ok";
}

// Une rotation d'un groupe déjà rechargé (voir getCompletedRefuelCheckpoints) :
// bon d'enlèvement (Resp. Opérations) à gauche, bon de déchargement à droite
// — désormais capturé par le chauffeur lui-même (DriverBonFinalEntryFlow.jsx),
// plus par le Collecteur. Le Collecteur contrôle ici la conformité entre les
// deux et enregistre son verdict : "Réconciliation OK" si tout concorde,
// sinon "Vérifié" avec un écart constaté et une observation.
function RotationBonRow({ rotation, isSaving, onValidate }) {
  const status = getRotationStatus(rotation);
  const [ecart, setEcart] = useState(!!rotation.ecart_bon_final);
  const [obs, setObs] = useState(rotation.observation_bon_final || "");

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between text-xs flex-wrap gap-1">
        <span className="font-bold">
          Rotation #{rotation.numero_rotation}
          <span className="font-normal text-muted-foreground"> · {fmtDate(rotation.date_rotation)}</span>
        </span>
        <span className="font-semibold text-secondary">
          {Number(rotation.poids_charge_tonnes || 0).toFixed(2)} T{rotation.numero_bon_client ? ` · BL ${rotation.numero_bon_client}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Bon enlèvement (Resp. Opérations)</p>
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
          <p className="text-[10px] text-muted-foreground mb-1">Bon déchargement (chauffeur)</p>
          {rotation.bon_final_scan_url ? (
            <button type="button" onClick={() => window.open(rotation.bon_final_scan_url, "_blank")} className="block w-full">
              <img src={rotation.bon_final_scan_url} alt="Bon de déchargement" className="w-full h-20 object-cover rounded border-2 border-emerald-400" />
            </button>
          ) : (
            <div className="w-full h-20 rounded border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-[10px]">En attente du chauffeur</span>
            </div>
          )}
        </div>
      </div>

      {rotation.bon_final_scan_url && (
        <div className="pt-2 border-t border-border space-y-1.5">
          {(rotation.poids_bon_final != null || rotation.numero_bon_final) && (
            <p className="text-[10px] text-muted-foreground">
              Lu par IA : {rotation.poids_bon_final != null ? `${Number(rotation.poids_bon_final).toFixed(2)} T` : "—"}
              {rotation.numero_bon_final ? ` · BL ${rotation.numero_bon_final}` : ""}
            </p>
          )}

          {status === "a_verifier" ? (
            <>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={ecart} onCheckedChange={(checked) => setEcart(!!checked)} />
                <span className={ecart ? "text-destructive font-semibold" : "text-muted-foreground"}>
                  Écart constaté
                </span>
              </label>
              {ecart && (
                <Textarea
                  className="text-xs min-h-[50px]"
                  placeholder="Décrire l'écart (poids, numéro de bon...)"
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                />
              )}
              <Button
                size="sm"
                className="h-7 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                disabled={isSaving}
                onClick={() => onValidate({ ecart, observation: ecart ? obs.trim() : null })}
              >
                Valider la vérification
              </Button>
            </>
          ) : (
            <>
              <Badge className={`${STATUS_BADGE_CLASS[status]} text-[10px]`}>
                {status === "reconciliation_ok" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                {STATUS_LABELS[status]}
              </Badge>
              {status === "verifie_ecart" && rotation.observation_bon_final && (
                <p className="text-xs text-destructive/90">{rotation.observation_bon_final}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const now = new Date();
const defaultPeriodFilter = { mode: "all", month: now.getMonth() + 1, quarter: Math.floor(now.getMonth() / 3) + 1, year: now.getFullYear(), from: "", to: "" };

// Espace dédié au Collecteur de bons — page autonome (comme /refuel pour les
// chauffeurs), sans le menu latéral. Il y voit les transactions déjà
// rechargées (jusqu'à la pompe, voir refuelRules.getCompletedRefuelCheckpoints)
// et contrôle, pour chacune, la conformité entre le bon d'enlèvement (saisi
// par le Resp. des Opérations) et le bon de déchargement (désormais scanné
// par le chauffeur lui-même, DriverBonFinalEntryFlow.jsx — le Collecteur ne
// scanne plus rien). Le verdict de ce contrôle ("Réconciliation OK" ou
// "Vérifié" avec écart et observation) est filtrable et imprimable en PDF.
export default function CollecteurBonsPage() {
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState(defaultPeriodFilter);

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
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*");
      if (error) throw error;
      return data;
    },
  });

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const fuelEntryMap = useMemo(() => Object.fromEntries(fuelEntries.map(f => [f.id, f])), [fuelEntries]);
  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map(c => [c.id, c])), [campaigns]);

  const enrichedCheckpoints = useMemo(() => {
    const checkpoints = getCompletedRefuelCheckpoints(rotations);
    return checkpoints
      .map(cp => ({ ...cp, status: getCheckpointStatus(cp) }))
      .sort((a, b) => new Date(b.rotations[0]?.date_rotation || 0) - new Date(a.rotations[0]?.date_rotation || 0));
  }, [rotations]);

  const counts = useMemo(() => {
    const c = { a_verifier: 0, reconciliation_ok: 0, verifie_ecart: 0 };
    enrichedCheckpoints.forEach(cp => { c[cp.status]++; });
    return c;
  }, [enrichedCheckpoints]);

  const periodRange = periodFilter.mode !== "all" ? getDateRange(periodFilter) : null;

  const filteredCheckpoints = useMemo(() => enrichedCheckpoints.filter(cp => {
    if (statusFilter !== "all" && cp.status !== statusFilter) return false;
    if (periodRange && !inRange(cp.rotations[0]?.date_rotation, periodRange)) return false;
    if (search.trim()) {
      const vehicle = vehicleMap[cp.vehicleId];
      const client = clientMap[cp.clientId];
      const haystack = `${vehicle?.immatriculation || ""} ${client?.nom || ""} ${cp.rotations.map(r => r.numero_bon_client || "").join(" ")}`.toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  }), [enrichedCheckpoints, statusFilter, periodRange, search, vehicleMap, clientMap]);

  const updateRotation = useMutation({
    mutationFn: async ({ id, payload, oldData }) => {
      const { error } = await supabase.from("rotations").update(payload).eq("id", id);
      if (error) throw error;
      await logAudit("Rotation", id, "update", payload, oldData, Object.keys(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast.success("Vérification enregistrée");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const handleValidate = (rotation, { ecart, observation }) => {
    updateRotation.mutate({
      id: rotation.id,
      payload: {
        ecart_bon_final: ecart,
        observation_bon_final: ecart ? observation : null,
        bon_final_verifie_le: new Date().toISOString(),
        bon_final_verifie_par: currentUser?.id || null,
      },
      oldData: rotation,
    });
  };

  const handlePrint = () => {
    const rows = filteredCheckpoints.flatMap(cp => cp.rotations.map(r => {
      const vehicle = vehicleMap[cp.vehicleId];
      const client = clientMap[cp.clientId];
      const status = getRotationStatus(r);
      return `<tr>
        <td>${vehicle?.immatriculation || "—"}</td>
        <td>${client?.nom || "—"}</td>
        <td>${fmtDate(r.date_rotation)}</td>
        <td>${Number(r.poids_charge_tonnes || 0).toFixed(2)}</td>
        <td>${r.poids_bon_final != null ? Number(r.poids_bon_final).toFixed(2) : "—"}</td>
        <td>${STATUS_LABELS[status]}</td>
        <td>${(r.observation_bon_final || "").replace(/</g, "&lt;")}</td>
      </tr>`;
    })).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Vérification des bons</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:24px;}
        h1{font-size:16px;margin:0 0 2px;}
        p.meta{color:#666;margin:0 0 16px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;}
        th{background:#f3f3f3;}
      </style></head>
      <body>
        <h1>Vérification des bons — Sierra Logistics</h1>
        <p class="meta">Généré le ${new Date().toLocaleString("fr-FR")} — ${filteredCheckpoints.length} enregistrement(s)</p>
        <table>
          <thead><tr><th>Véhicule</th><th>Client</th><th>Date</th><th>Poids enlèvement (T)</th><th>Poids déchargement (T)</th><th>Statut</th><th>Observation</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=800");
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  if (isLoading) {
    return (
      <div className="min-h-viewport bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-viewport bg-background flex flex-col">
      <header className="h-14 bg-primary flex items-center justify-between px-4 flex-shrink-0">
        <img src="/assets/sierra-logistics-logo.png" alt="Sierra Logistics" className="h-8 object-contain bg-white rounded-lg px-1" />
        <button onClick={logout} className="text-primary-foreground/70 hover:text-primary-foreground p-2">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl lg:max-w-5xl xl:max-w-6xl w-full mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-secondary" /> Vérification des bons
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Contrôle de conformité entre bons d'enlèvement et bons de déchargement
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 lg:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher véhicule, client, numéro de bon..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              ["all", `Tout (${enrichedCheckpoints.length})`],
              ["a_verifier", `À vérifier (${counts.a_verifier})`],
              ["reconciliation_ok", `Réconciliation OK (${counts.reconciliation_ok})`],
              ["verifie_ecart", `Vérifié écart (${counts.verifie_ecart})`],
            ].map(([v, l]) => (
              <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"} onClick={() => setStatusFilter(v)} className={statusFilter === v ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs" : "text-xs"}>
                {l}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={handlePrint} disabled={filteredCheckpoints.length === 0}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimer PDF
          </Button>
        </div>

        <PeriodFilter filter={periodFilter} onChange={setPeriodFilter} />

        {filteredCheckpoints.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun enregistrement pour ces filtres</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCheckpoints.map(cp => {
              const vehicle = vehicleMap[cp.vehicleId];
              const driver = driverMap[vehicle?.driver_id];
              const client = clientMap[cp.clientId];
              const fuelEntry = fuelEntryMap[cp.fuelEntryId];
              const campaign = campaignMap[cp.rotations[0]?.campaign_id];
              const totalPoids = cp.rotations.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
              return (
                <div key={`${cp.clientId}-${cp.vehicleId}-${cp.fuelEntryId}`} className="bg-card border border-border rounded-2xl overflow-hidden h-fit">
                  <div className="bg-muted/40 px-4 py-3 flex items-center gap-3 border-b border-border">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm font-mono truncate">{vehicle?.immatriculation || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {driver ? `${driver.prenom} ${driver.nom}` : "Chauffeur inconnu"} · {client?.nom || "Client inconnu"}
                        {campaign?.nom_campagne && (
                          <span className="inline-flex items-center gap-0.5"> · <Ship className="w-3 h-3 inline" /> {campaign.nom_campagne}</span>
                        )}
                      </p>
                    </div>
                    <Badge className={`${STATUS_BADGE_CLASS[cp.status]} text-[10px] shrink-0`}>
                      {STATUS_LABELS[cp.status]}
                    </Badge>
                  </div>

                  <div className="px-4 py-3 border-b border-border bg-secondary/5 space-y-2">
                    <p className="text-[11px] font-semibold text-secondary flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5" /> Rechargement carburant
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {fmtDateTime(fuelEntry?.date ? `${fuelEntry.date}T${fuelEntry.heure || "00:00"}` : null)}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{fuelEntry?.station || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Droplet className="w-3.5 h-3.5 shrink-0" />
                        {fuelEntry?.litres ? `${Number(fuelEntry.litres).toLocaleString("fr-FR")} L` : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Coins className="w-3.5 h-3.5 shrink-0" />
                        {fuelEntry?.montant_total ? `${Number(fuelEntry.montant_total).toLocaleString("fr-FR")} FCFA` : "—"}
                      </div>
                    </div>
                    {fuelEntry?.recu_url && (
                      <button type="button" onClick={() => window.open(fuelEntry.recu_url, "_blank")} className="block">
                        <img src={fuelEntry.recu_url} alt="Photo de la pompe" className="h-24 rounded-lg border border-border object-cover" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground bg-muted/30 rounded-lg px-3 py-2">
                      <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary" /> Tonnage total des bons d'enlèvement</span>
                      <span className="text-primary">{totalPoids.toFixed(2)} T</span>
                    </div>

                    {cp.rotations.map(r => (
                      <RotationBonRow
                        key={r.id}
                        rotation={r}
                        isSaving={updateRotation.isPending}
                        onValidate={(result) => handleValidate(r, result)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmDialogHost />
    </div>
  );
}
