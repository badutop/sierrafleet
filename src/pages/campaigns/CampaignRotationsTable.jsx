import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Fuel, RotateCw, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Ce tableau est désormais purement consultatif pour les bons physiques : le
// scan se fait à la saisie de la fiche du jour (RotationSheetEntry) et la
// validation se fait exclusivement dans Carburant > Validation (Responsable
// Exploitation ou Admin, par groupe de 3 rotations — voir
// FuelValidationTab.jsx et refuelRules.getRefuelCheckpoints). Un bon reste
// "À valider" ici sans aucune action possible tant que cette validation
// carburant n'a pas eu lieu ; c'est seulement à ce moment que le chauffeur
// peut voir ses bons dans son espace et recharger (bon_physique_recu).
export default function CampaignRotationsTable({ rotations, vehicles, drivers }) {
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
                <span className="font-semibold text-secondary">{rots.length} rotations</span> — {totalPoids.toFixed(2)} T
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
                            {vehicle?.immatriculation || "Sans camion"}
                            <span className="font-normal text-muted-foreground"> — {vRots.length} rotation{vRots.length > 1 ? "s" : ""} — {vPoids.toFixed(2)} T</span>
                          </TableCell>
                        </TableRow>
                        {vRots.map(r => (
                          <TableRow key={r.id} className={cn(r.refuel_declenche && "bg-amber-50 dark:bg-amber-950/20")}>
                            <TableCell className="font-bold text-sm">{r.numero_rotation}</TableCell>
                            <TableCell className="text-sm font-mono">{r.numero_bon_client || "—"}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{Number(r.poids_charge_tonnes || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-sm">{r.litres_carburant_alloues || 0}</TableCell>
                            <TableCell>
                              {r.fuel_entry_id ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]"><Fuel className="w-3 h-3 mr-1" />Rechargement effectué</Badge>
                              ) : r.refuel_effectue ? (
                                <Badge className="bg-blue-500/10 text-blue-600 text-[10px]"><Fuel className="w-3 h-3 mr-1" />Validé (Carburant)</Badge>
                              ) : r.refuel_declenche ? (
                                <Badge className="bg-amber-500/10 text-amber-600 text-[10px]"><Fuel className="w-3 h-3 mr-1" />En attente bons</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {r.bon_physique_recu ? (
                                  <span
                                    title="Bon validé — définitif"
                                    className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"
                                  >
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </span>
                                ) : (
                                  <Badge className="bg-amber-500/10 text-amber-600 text-[10px]" title="Validation effectuée dans Carburant > Validation">
                                    À valider
                                  </Badge>
                                )}
                                {r.bon_physique_scan_url && !r.bon_physique_recu && (
                                  <a href={r.bon_physique_scan_url} target="_blank" rel="noreferrer" title="Voir le scan du bon" className="text-muted-foreground hover:text-secondary">
                                    <ImageIcon className="w-3.5 h-3.5" />
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
                    <TableCell colSpan={2} className="text-right text-xs font-bold uppercase text-secondary">Total journée</TableCell>
                    <TableCell className="text-right text-sm font-bold text-secondary">{totalPoids.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell colSpan={3} className="text-xs text-muted-foreground text-right">{totalPoids.toFixed(2)} T</TableCell>
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
