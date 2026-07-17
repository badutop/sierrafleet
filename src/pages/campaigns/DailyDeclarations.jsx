import React from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const statutColors = { brouillon: "bg-muted text-muted-foreground", soumis: "bg-blue-500/10 text-blue-600", valide: "bg-emerald-500/10 text-emerald-600", ecart_detecte: "bg-destructive/10 text-destructive" };
const statutLabels = { brouillon: "Brouillon", soumis: "Soumis", valide: "Validé", ecart_detecte: "Écart détecté" };

// "Déclaration journalière" avait son propre formulaire simplifié
// (saisie manuelle d'un total de rotations/tonnage/bons pour la journée),
// distinct de la vraie fiche de débarquement (RotationSheetEntry, une ligne
// par camion avec BL et poids, qui alimente réellement les rotations et les
// compteurs de la campagne). Remplacé par "Saisir fiche du jour" pour ne
// garder qu'un seul vrai formulaire de saisie.
export default function DailyDeclarations({ declarations, vehicles, campaign, onOpenFicheJour }) {
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const canOpenFicheJour = campaign?.statut === "en_cours";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          onClick={onOpenFicheJour}
          disabled={!canOpenFicheJour}
          title={canOpenFicheJour ? undefined : "La campagne doit être en cours pour saisir une fiche du jour"}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> Saisir fiche du jour
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Camion</TableHead>
              <TableHead className="font-bold">BL Navire</TableHead>
              <TableHead className="text-right font-bold">Rotations</TableHead>
              <TableHead className="text-right font-bold">Tonnage (kg)</TableHead>
              <TableHead className="text-right font-bold">Bons sys.</TableHead>
              <TableHead className="text-right font-bold">Bons phys.</TableHead>
              <TableHead className="text-right font-bold">Écart</TableHead>
              <TableHead className="font-bold">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {declarations.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">Aucune déclaration enregistrée</TableCell></TableRow>
            ) : declarations.map(d => (
              <TableRow key={d.id}>
                <TableCell className="text-sm font-medium">{d.date_declaration}</TableCell>
                <TableCell className="text-sm font-mono">{vehicleMap[d.vehicle_id]?.immatriculation || "—"}</TableCell>
                <TableCell className="text-sm font-mono">{d.bl_navire || "—"}</TableCell>
                <TableCell className="text-right text-sm">{d.nombre_rotations_jour}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{Number(d.tonnage_total_jour || 0).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right text-sm">{d.bons_systeme}</TableCell>
                <TableCell className="text-right text-sm">{d.bons_physiques}</TableCell>
                <TableCell className={cn("text-right text-sm font-bold", d.ecart_bons !== 0 ? "text-destructive" : "text-emerald-600")}>
                  {d.ecart_bons > 0 ? `+${d.ecart_bons}` : d.ecart_bons}
                </TableCell>
                <TableCell><Badge className={cn("text-[10px]", statutColors[d.statut_validation])}>{statutLabels[d.statut_validation]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
