import React, { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPES = ["carburant", "peage", "rations", "contravention", "transport", "autre"];
const TYPE_LABELS = {
  carburant: "Carburant", peage: "Péage", rations: "Rations",
  contravention: "Contravention", transport: "Transport", autre: "Autre",
};
const MONTH_NAMES = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const fmt = n => n > 0 ? new Intl.NumberFormat("fr-FR").format(Math.round(n)) : "—";

export default function VehicleExpenseDetail({ vehicle, expenses, filterYear, onClose }) {
  // Group expenses by month × type
  const { months, grandTotals, grandTotal } = useMemo(() => {
    const byMonth = {};
    expenses.forEach(e => {
      if (!e.date_frais) return;
      const [, m] = e.date_frais.split("-");
      const month = parseInt(m, 10);
      if (!byMonth[month]) byMonth[month] = { byType: {}, total: 0 };
      const t = e.type_frais || "autre";
      byMonth[month].byType[t] = (byMonth[month].byType[t] || 0) + (e.montant || 0);
      byMonth[month].total += e.montant || 0;
    });
    const months = Object.entries(byMonth)
      .map(([m, data]) => ({ month: parseInt(m), ...data }))
      .sort((a, b) => a.month - b.month);

    const grandTotals = {};
    TYPES.forEach(t => { grandTotals[t] = months.reduce((s, m) => s + (m.byType[t] || 0), 0); });
    const grandTotal = months.reduce((s, m) => s + m.total, 0);
    return { months, grandTotals, grandTotal };
  }, [expenses]);

  return (
    <div className="bg-card rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            {vehicle?.code_camion && (
              <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">{vehicle.code_camion}</span>
            )}
            <span className="font-bold text-base font-mono">{vehicle?.immatriculation || "Véhicule inconnu"}</span>
            {vehicle?.marque && <span className="text-sm text-muted-foreground">{vehicle.marque} {vehicle.modele}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Dépenses par poste — Année {filterYear}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      {months.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucune dépense pour ce véhicule sur cette période.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs min-w-[80px]">Mois</TableHead>
                {TYPES.map(t => <TableHead key={t} className="text-xs text-right">{TYPE_LABELS[t]}</TableHead>)}
                <TableHead className="text-xs text-right font-bold">Total mois</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map(({ month, byType, total }) => (
                <TableRow key={month} className="hover:bg-muted/20">
                  <TableCell className="text-xs font-semibold">{MONTH_NAMES[month]}</TableCell>
                  {TYPES.map(t => (
                    <TableCell key={t} className="text-xs text-right">{fmt(byType[t] || 0)}</TableCell>
                  ))}
                  <TableCell className="text-xs text-right font-bold text-secondary">{fmt(total)}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                <TableCell className="text-xs font-bold text-primary uppercase tracking-wide">TOTAL</TableCell>
                {TYPES.map(t => (
                  <TableCell key={t} className="text-xs text-right font-bold">{fmt(grandTotals[t] || 0)}</TableCell>
                ))}
                <TableCell className="text-xs text-right font-bold text-secondary text-sm">{fmt(grandTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}