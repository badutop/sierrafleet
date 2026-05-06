import React, { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fuel, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const zoneConsoVal = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };
const zoneLabels = { zone1: "Zone 1 (8–10L)", zone2: "Zone 2 (25L)", zone3: "Zone 3 (30L)", zone4: "Zone 4 (40L)" };

export default function FuelCampaignTab({ campaigns, rotations, entries, clients, vehicles, formatCFA }) {
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const data = useMemo(() => {
    return campaigns.map(campaign => {
      const client = clientMap[campaign.client_id];
      const zone = client?.zone || "zone1";
      const consoZone = zoneConsoVal[zone] || 9;

      const campRotations = rotations.filter(r => r.campaign_id === campaign.id);
      const nbRotations = campRotations.length;
      const consoTheorique = campRotations.reduce((s, r) => s + (r.litres_carburant_alloues || 0), 0);

      const refuelsAuto = entries.filter(e => e.station?.includes(campaign.nom_campagne));
      const litresReels = refuelsAuto.reduce((s, e) => s + (e.litres || 0), 0);
      const coutReel = refuelsAuto.reduce((s, e) => s + (e.montant_total || 0), 0);

      const ecart = litresReels - consoTheorique;
      const ecartPct = consoTheorique > 0 ? (ecart / consoTheorique) * 100 : 0;

      return { campaign, client, zone, consoZone, nbRotations, consoTheorique, litresReels, coutReel, ecart, ecartPct };
    }).filter(d => d.nbRotations > 0 || d.litresReels > 0);
  }, [campaigns, rotations, entries, clientMap]);

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Aucune donnée disponible — enregistrez des rotations pour voir les statistiques.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground">
        <strong>Consommation par zone :</strong> Zone 1 → 8–10 L/rot · Zone 2 → 25 L/rot · Zone 3 → 30 L/rot · Zone 4 → 40 L/rot
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Campagne</TableHead>
              <TableHead className="text-xs">Client / Zone</TableHead>
              <TableHead className="text-xs text-right">Rotations</TableHead>
              <TableHead className="text-xs text-right">Théorique (L)</TableHead>
              <TableHead className="text-xs text-right">Réel (L)</TableHead>
              <TableHead className="text-xs text-right">Écart</TableHead>
              <TableHead className="text-xs text-right">Coût (FCFA)</TableHead>
              <TableHead className="text-xs text-center">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(({ campaign, client, zone, consoZone, nbRotations, consoTheorique, litresReels, coutReel, ecart, ecartPct }) => (
              <TableRow key={campaign.id} className={cn("hover:bg-muted/30", Math.abs(ecartPct) > 15 && "bg-destructive/5")}>
                <TableCell className="text-xs font-semibold">{campaign.nom_campagne}</TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{client?.nom || "—"}</div>
                  <div className="text-muted-foreground">{zoneLabels[zone] || zone}</div>
                </TableCell>
                <TableCell className="text-xs text-right font-medium">{nbRotations}</TableCell>
                <TableCell className="text-xs text-right text-muted-foreground">{consoTheorique.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-xs text-right font-medium">{litresReels.toLocaleString("fr-FR")}</TableCell>
                <TableCell className={cn(
                  "text-xs text-right font-bold",
                  ecart > 0 ? "text-destructive" : ecart < 0 ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  {ecart >= 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")} L
                </TableCell>
                <TableCell className="text-xs text-right">{formatCFA(coutReel)}</TableCell>
                <TableCell className="text-center text-xs">
                  {Math.abs(ecartPct) <= 5
                    ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/30 text-[10px]">OK</Badge>
                    : Math.abs(ecartPct) <= 15
                    ? <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/30 text-[10px]">Modéré</Badge>
                    : <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Alerte</Badge>
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}