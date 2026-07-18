import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Fuel, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { consoLitresPourClient, findRefuelCheckpoint } from "@/lib/refuelRules";

export default function CampaignRotationsTable({ rotations, vehicles, drivers, clients = [], campaignId }) {
  const queryClient = useQueryClient();
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  // Le refuel ne se déclenche réellement qu'ici : une fois les 3 bons
  // physiques d'un même client + même camion tous confirmés (pas à la
  // saisie de la fiche du jour, où refuel_declenche n'est qu'une prédiction).
  const updateBon = useMutation({
    mutationFn: async ({ rotId, received }) => {
      const { error } = await supabase.from("rotations").update({ bon_physique_recu: received }).eq("id", rotId);
      if (error) throw error;
      if (!received) return { refueled: false };

      const rotation = rotations.find(r => r.id === rotId);
      if (!rotation?.client_id || !rotation?.vehicle_id) return { refueled: false };

      const updatedRotations = rotations.map(r => r.id === rotId ? { ...r, bon_physique_recu: true } : r);
      const checkpoint = findRefuelCheckpoint(updatedRotations, rotation.client_id, rotation.vehicle_id);
      if (!checkpoint) return { refueled: false };

      const client = clientMap[rotation.client_id];
      const conso = consoLitresPourClient(client);
      const { error: fuelError } = await supabase.from("fuel_entries").insert({
        id: crypto.randomUUID(),
        vehicle_id: checkpoint.vehicle_id,
        date: new Date().toISOString().split("T")[0],
        litres: conso * 3,
        montant_total: conso * 3 * 650,
        km_compteur: 0,
        station: `Refuel auto — 3 bons physiques confirmés (${client?.nom || "client"})`,
        statut: "en_attente",
      });
      if (fuelError) throw fuelError;

      const { error: markError } = await supabase.from("rotations").update({ refuel_effectue: true }).eq("id", checkpoint.id);
      if (markError) throw markError;

      return { refueled: true, vehicle: vehicleMap[checkpoint.vehicle_id] };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["rotations", campaignId] });
      if (result?.refueled) toast.info(`Refuel déclenché pour ${result.vehicle?.immatriculation || "le camion"} (3 bons confirmés)`);
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  // Group by date
  const grouped = rotations.reduce((acc, r) => {
    const day = r.date_rotation ? new Date(r.date_rotation).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Sans date";
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {});

  if (rotations.length === 0) return (
    <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground">
      <RotateCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Aucune rotation enregistrée</p>
      <p className="text-xs mt-1">Démarrez la campagne et saisissez la fiche du jour</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, rots]) => {
        const totalPoids = rots.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
        return (
          <div key={day}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground capitalize">{day}</h3>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-secondary">{rots.length} rotations</span> — {totalPoids.toFixed(3)} T
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-10 font-bold">#</TableHead>
                    <TableHead className="font-bold">BL</TableHead>
                    <TableHead className="text-right font-bold">POIDS (T)</TableHead>
                    <TableHead className="text-right font-bold">Conso. (L)</TableHead>
                    <TableHead className="font-bold">Refuel</TableHead>
                    <TableHead className="font-bold">Bon physique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Sous-groupe par camion : rotations d'un même véhicule
                      regroupées consécutivement pour la lisibilité, au lieu
                      d'être entremêlées entre plusieurs camions. */}
                  {Object.entries(
                    rots.reduce((acc, r) => {
                      const vid = r.vehicle_id || "sans_camion";
                      if (!acc[vid]) acc[vid] = [];
                      acc[vid].push(r);
                      return acc;
                    }, {})
                  ).map(([vid, vRots]) => {
                    const vehicle = vehicleMap[vid];
                    const vPoids = vRots.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
                    return (
                      <React.Fragment key={vid}>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={6} className="py-1.5 text-xs font-bold text-foreground">
                            {vehicle?.code_camion ? `[${vehicle.code_camion}] ` : ""}{vehicle?.immatriculation || "Sans camion"}
                            <span className="font-normal text-muted-foreground"> — {vRots.length} rotation{vRots.length > 1 ? "s" : ""} — {vPoids.toFixed(3)} T</span>
                          </TableCell>
                        </TableRow>
                        {vRots.map(r => (
                          <TableRow key={r.id} className={cn(r.refuel_declenche && "bg-amber-50 dark:bg-amber-950/20")}>
                            <TableCell className="font-bold text-sm">{r.numero_rotation}</TableCell>
                            <TableCell className="text-sm font-mono">{r.numero_bon_client || "—"}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{Number(r.poids_charge_tonnes || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</TableCell>
                            <TableCell className="text-right text-sm">{r.litres_carburant_alloues || 0}</TableCell>
                            <TableCell>
                              {r.refuel_effectue ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]"><Fuel className="w-3 h-3 mr-1" />Refuel fait</Badge>
                              ) : r.refuel_declenche ? (
                                <Badge className="bg-amber-500/10 text-amber-600 text-[10px]"><Fuel className="w-3 h-3 mr-1" />En attente bons</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => updateBon.mutate({ rotId: r.id, received: !r.bon_physique_recu })}
                                className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors", r.bon_physique_recu ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-emerald-500")}
                              >
                                {r.bon_physique_recu && <CheckCircle className="w-3 h-3 text-white" />}
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  <TableRow className="bg-secondary/10 font-bold">
                    <TableCell colSpan={2} className="text-right text-xs font-bold uppercase text-secondary">Total journée</TableCell>
                    <TableCell className="text-right text-sm font-bold text-secondary">{totalPoids.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</TableCell>
                    <TableCell colSpan={3} className="text-xs text-muted-foreground text-right">{totalPoids.toFixed(3)} T</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}

      {/* Grand cumul */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm">
        <div className="flex justify-between font-bold">
          <span>CUMULS DÉBARQUÉS</span>
          <span className="text-primary">{rotations.length} ROTATIONS → {rotations.reduce((s, r) => s + Number(r.poids_charge_tonnes || 0), 0).toFixed(3)} T</span>
        </div>
      </div>
    </div>
  );
}