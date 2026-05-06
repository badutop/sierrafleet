import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = ["carburant", "peage", "rations", "contravention", "transport", "autre"];
const TYPE_LABELS = {
  carburant: "Carburant", peage: "Péage", rations: "Rations",
  contravention: "Contravention", transport: "Transport", autre: "Autre",
};
const fmt = n => n > 0 ? new Intl.NumberFormat("fr-FR").format(Math.round(n)) : "—";

export default function ExpenseByVehicleTable({ expenses, vehicles, vMap, isLoading }) {
  const [expanded, setExpanded] = useState({});

  // Group expenses by vehicle
  const rows = useMemo(() => {
    const byVehicle = {};
    expenses.forEach(e => {
      const vid = e.vehicle_id || "__unknown__";
      if (!byVehicle[vid]) byVehicle[vid] = { byType: {}, entries: [], total: 0 };
      const t = e.type_frais || "autre";
      byVehicle[vid].byType[t] = (byVehicle[vid].byType[t] || 0) + (e.montant || 0);
      byVehicle[vid].entries.push(e);
      byVehicle[vid].total += e.montant || 0;
    });
    return Object.entries(byVehicle)
      .map(([vid, data]) => ({ vid, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Grand totals per type
  const grandTotals = useMemo(() => {
    const totals = {};
    rows.forEach(r => TYPES.forEach(t => { totals[t] = (totals[t] || 0) + (r.byType[t] || 0); }));
    totals.__total__ = rows.reduce((s, r) => s + r.total, 0);
    return totals;
  }, [rows]);

  const toggle = (vid) => setExpanded(prev => ({ ...prev, [vid]: !prev[vid] }));

  if (isLoading) return (
    <div className="bg-card rounded-xl border border-border flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin" />
    </div>
  );

  if (rows.length === 0) return (
    <div className="bg-card rounded-xl border border-border text-center py-16 text-muted-foreground text-sm">
      Aucune dépense enregistrée pour cette période.
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs w-8" />
            <TableHead className="text-xs min-w-[140px]">Camion</TableHead>
            {TYPES.map(t => <TableHead key={t} className="text-xs text-right">{TYPE_LABELS[t]}</TableHead>)}
            <TableHead className="text-xs text-right font-bold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ vid, byType, entries, total }) => {
            const vehicle = vMap[vid];
            const isOpen = !!expanded[vid];
            return (
              <React.Fragment key={vid}>
                {/* Vehicle summary row */}
                <TableRow
                  className="cursor-pointer hover:bg-muted/30 font-medium"
                  onClick={() => toggle(vid)}
                >
                  <TableCell className="text-xs">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="text-xs">
                    {vehicle ? (
                      <div className="flex items-center gap-1.5">
                        {vehicle.code_camion && <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{vehicle.code_camion}</span>}
                        <span className="font-semibold font-mono">{vehicle.immatriculation}</span>
                      </div>
                    ) : <span className="text-muted-foreground italic text-[11px]">Véhicule inconnu</span>}
                  </TableCell>
                  {TYPES.map(t => (
                    <TableCell key={t} className="text-xs text-right">{fmt(byType[t] || 0)}</TableCell>
                  ))}
                  <TableCell className="text-xs text-right font-bold text-secondary">{fmt(total)}</TableCell>
                </TableRow>

                {/* Expanded detail rows */}
                {isOpen && entries.sort((a, b) => (b.date_frais || "").localeCompare(a.date_frais || "")).map(e => (
                  <TableRow key={e.id} className="bg-muted/20 text-[11px]">
                    <TableCell />
                    <TableCell className="text-[11px] text-muted-foreground pl-6">
                      <span className="font-medium">{e.date_frais || "—"}</span>
                      {e.description && <span className="ml-2 opacity-70">· {e.description}</span>}
                      {e.executeur && <span className="ml-2 italic opacity-50">{e.executeur}</span>}
                    </TableCell>
                    {TYPES.map(t => (
                      <TableCell key={t} className="text-[11px] text-right">
                        {e.type_frais === t ? (
                          <span className="font-medium">{fmt(e.montant || 0)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-[11px] text-right font-medium">{fmt(e.montant || 0)}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}

          {/* Grand Total row */}
          <TableRow className="bg-primary/5 border-t-2 border-primary/20 font-bold">
            <TableCell />
            <TableCell className="text-xs font-bold text-primary uppercase tracking-wide">TOTAL GÉNÉRAL</TableCell>
            {TYPES.map(t => (
              <TableCell key={t} className="text-xs text-right font-bold">{fmt(grandTotals[t] || 0)}</TableCell>
            ))}
            <TableCell className="text-xs text-right font-bold text-secondary text-sm">{fmt(grandTotals.__total__ || 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}