import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function EcartBadge({ ecartPct }) {
  const abs = Math.abs(ecartPct);
  if (abs <= 5) return (
    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/30 gap-1 text-[10px]">
      <CheckCircle2 className="w-2.5 h-2.5" /> OK
    </Badge>
  );
  if (abs <= 15) return (
    <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/30 gap-1 text-[10px]">
      <Minus className="w-2.5 h-2.5" /> Modéré
    </Badge>
  );
  return (
    <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 text-[10px]">
      <AlertTriangle className="w-2.5 h-2.5" /> Alerte
    </Badge>
  );
}

export default function FuelVarianceTable({ data, formatCFA }) {
  const sorted = [...data].sort((a, b) => Math.abs(b.ecartPct) - Math.abs(a.ecartPct));

  return (
    <div className="space-y-3">
      <div className="bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground">
        <strong>Méthode de calcul :</strong> Théorique = somme des litres alloués par rotation (selon la zone client). Réel = somme des litres saisis dans les approvisionnements. L'écart positif indique une surconsommation.
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Véhicule</TableHead>
              <TableHead className="text-xs text-right">Rotations</TableHead>
              <TableHead className="text-xs text-right">Théorique (L)</TableHead>
              <TableHead className="text-xs text-right">Réel (L)</TableHead>
              <TableHead className="text-xs text-right">Écart (L)</TableHead>
              <TableHead className="text-xs text-right">Écart %</TableHead>
              <TableHead className="text-xs text-right">Coût réel</TableHead>
              <TableHead className="text-xs text-center">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  Aucune donnée disponible — enregistrez des rotations et des approvisionnements.
                </TableCell>
              </TableRow>
            ) : sorted.map(({ vehicle, theorique, reel, ecart, ecartPct, coutReel, rotCount }) => {
              const surConso = ecart > 0;
              return (
                <TableRow key={vehicle.id} className={cn(
                  "hover:bg-muted/30",
                  Math.abs(ecartPct) > 15 && "bg-destructive/5"
                )}>
                  <TableCell className="text-xs font-semibold font-mono">{vehicle.immatriculation}</TableCell>
                  <TableCell className="text-xs text-right">{rotCount}</TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">
                    {theorique.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {reel.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className={cn(
                    "text-xs text-right font-bold flex items-center justify-end gap-1",
                    surConso ? "text-destructive" : ecart < 0 ? "text-emerald-600" : "text-muted-foreground"
                  )}>
                    {surConso ? <TrendingUp className="w-3 h-3" /> : ecart < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                    {ecart >= 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className={cn(
                    "text-xs text-right font-bold",
                    Math.abs(ecartPct) > 15 ? "text-destructive" : Math.abs(ecartPct) > 5 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {ecart >= 0 ? "+" : ""}{ecartPct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-xs text-right">{formatCFA(coutReel)}</TableCell>
                  <TableCell className="text-center"><EcartBadge ecartPct={ecartPct} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}