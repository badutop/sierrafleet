import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Fuel, RotateCw, ImageIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Ce tableau est purement consultatif. "Bon enlèvement" (bon_physique_scan_url)
// est considéré validé dès la saisie de la fiche du jour par le Responsable
// des Opérations — pas d'état "à valider" ici, cette saisie fait foi. Le
// "Refuel" (refuel_declenche) signale seulement qu'une rotation appartient à
// un groupe de 3 éligible à un rechargement (voir FuelValidationTab.jsx et
// refuelRules.getRefuelCheckpoints pour le détail du workflow carburant, qui
// reste inchangé). "Bon déchargement" (bon_final_scan_url) n'est renseigné
// que plus tard, par le Collecteur de bons (CollecteurBonsPage.jsx).
export default function CampaignRotationsTable({ rotations, vehicles, drivers, fuelEntryMap = {} }) {
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));

  // Les dernières rotations en premier : tri décroissant (date, puis numéro)
  // avant le regroupement par jour, pour que les journées ET les rotations
  // d'une même journée s'affichent des plus récentes aux plus anciennes.
  const sortedRotations = [...rotations].sort((a, b) => {
    const dateDiff = new Date(b.date_rotation || 0) - new Date(a.date_rotation || 0);
    if (dateDiff !== 0) return dateDiff;
    return (b.numero_rotation || 0) - (a.numero_rotation || 0);
  });

  // Group by date
  const grouped = sortedRotations.reduce((acc, r) => {
    const day = r.date_rotation ? new Date(r.date_rotation).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Sans date";
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {});

  if (rotations.length === 0) return (
    <div className="bg-card rounded-xl border border-sidebar py-14 text-center text-muted-foreground">
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
                <span className="font-semibold text-secondary">{rots.length} rotations</span> — {totalPoids.toFixed(2)} T
              </div>
            </div>
            <div className="bg-card rounded-xl border border-sidebar overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-10 font-bold">#</TableHead>
                    <TableHead className="font-bold">Heure</TableHead>
                    <TableHead className="font-bold">BL</TableHead>
                    <TableHead className="text-right font-bold">POIDS (T)</TableHead>
                    <TableHead className="text-right font-bold">Conso. (L)</TableHead>
                    <TableHead className="font-bold">Refuel</TableHead>
                    <TableHead className="font-bold">Bon enlèvement</TableHead>
                    <TableHead className="font-bold">Bon déchargement</TableHead>
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
                          <TableCell colSpan={8} className="py-1.5 text-xs font-bold text-foreground">
                            {vehicle?.immatriculation || "Sans camion"}
                            {vehicle && driverMap[vehicle.driver_id] && (
                              <span className="font-semibold text-muted-foreground"> · {driverMap[vehicle.driver_id]}</span>
                            )}
                            <span className="font-normal text-muted-foreground"> — {vRots.length} rotation{vRots.length > 1 ? "s" : ""} — {vPoids.toFixed(2)} T</span>
                          </TableCell>
                        </TableRow>
                        {vRots.map(r => (
                          <TableRow key={r.id} className={cn(r.refuel_declenche && "bg-amber-50 dark:bg-amber-950/20")}>
                            <TableCell className="font-bold text-sm">{r.numero_rotation}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.date_rotation ? new Date(r.date_rotation).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-mono">{r.numero_bon_client || "—"}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{Number(r.poids_charge_tonnes || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-sm">{r.litres_carburant_alloues || 0}</TableCell>
                            <TableCell>
                              {r.refuel_declenche && (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    title={
                                      r.fuel_entry_id
                                        ? "Rechargement effectué par le chauffeur (photo pompe validée)"
                                        : r.refuel_effectue
                                        ? "Rechargement validé par le Responsable Exploitation (Carburant > Validation)"
                                        : "Bon éligible pour un refuel (groupe de 3 rotations), en attente de validation Carburant"
                                    }
                                    className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                      r.fuel_entry_id ? "bg-emerald-500" : r.refuel_effectue ? "bg-orange-500" : "bg-blue-500"
                                    )}
                                  >
                                    <Fuel className="w-3 h-3 text-white" />
                                  </span>
                                  {r.fuel_entry_id && fuelEntryMap[r.fuel_entry_id]?.recu_url && (
                                    <a href={fuelEntryMap[r.fuel_entry_id].recu_url} target="_blank" rel="noreferrer" title="Voir la photo de la pompe" className="text-muted-foreground hover:text-secondary p-1 -m-1">
                                      <ImageIcon className="w-5 h-5" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {r.bon_physique_scan_url ? (
                                  <span
                                    title="Bon d'enlèvement saisi et validé par le Responsable des Opérations"
                                    className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center shrink-0"
                                  >
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                                {r.bon_physique_scan_url && (
                                  <a href={r.bon_physique_scan_url} target="_blank" rel="noreferrer" title="Voir le scan du bon" className="text-muted-foreground hover:text-secondary p-1 -m-1">
                                    <ImageIcon className="w-5 h-5" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {/* Bon déchargement (bon_final_scan_url) — voir
                                  CollecteurBonsPage.jsx. Distinct du bon d'enlèvement
                                  ci-dessus : reste vide tant que le Collecteur de bons
                                  ne l'a pas collecté (après le rechargement). */}
                              <div className="flex items-center gap-1.5">
                                {!r.bon_final_scan_url ? (
                                  <span className="text-muted-foreground text-xs">—</span>
                                ) : r.ecart_bon_final ? (
                                  <Badge className="bg-destructive/10 text-destructive text-[10px]" title={r.observation_bon_final || "Écart constaté par le Collecteur de bons"}>
                                    <AlertTriangle className="w-3 h-3 mr-1" />Écart
                                  </Badge>
                                ) : (
                                  <span
                                    title="Bon déchargement réconcilié — aucun écart"
                                    className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shrink-0"
                                  >
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </span>
                                )}
                                {r.bon_final_scan_url && (
                                  <a href={r.bon_final_scan_url} target="_blank" rel="noreferrer" title="Voir le scan du bon déchargement" className="text-muted-foreground hover:text-secondary p-1 -m-1">
                                    <ImageIcon className="w-5 h-5" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  <TableRow className="bg-secondary/10 font-bold">
                    <TableCell colSpan={3} className="text-right text-xs font-bold uppercase text-secondary">Total journée</TableCell>
                    <TableCell className="text-right text-sm font-bold text-secondary">{totalPoids.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground text-right">{totalPoids.toFixed(2)} T</TableCell>
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
          <span className="text-primary">{rotations.length} ROTATIONS → {rotations.reduce((s, r) => s + Number(r.poids_charge_tonnes || 0), 0).toFixed(2)} T</span>
        </div>
      </div>
    </div>
  );
}
