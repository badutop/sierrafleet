import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { getPrixTonne, getTvaPct } from "@/components/campaigns/CampaignInvoice";
import PeriodFilter, { getDateRange, inRange } from "@/components/reports/PeriodFilter";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

const now = new Date();
const defaultFilter = { mode: "all", month: now.getMonth() + 1, year: now.getFullYear(), from: "", to: "" };

const MargeIcon = ({ taux }) => {
  if (taux === null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (taux >= 20) return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
  if (taux >= 0) return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
  return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
};

const MargeBadge = ({ taux }) => {
  if (taux === null) return <Badge variant="outline" className="text-xs">N/A</Badge>;
  const cls = taux >= 20 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : taux >= 0 ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${cls}`}>
      <MargeIcon taux={taux} />
      {taux.toFixed(1)}%
    </span>
  );
};

export default function CampaignFinancialReport() {
  const [filter, setFilter] = useState(defaultFilter);
  const prixTonne = getPrixTonne();
  const tvaPct = getTvaPct();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("date_debut", { ascending: false }).limit(200);
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
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").order("date_rotation", { ascending: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date_frais", { ascending: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const { data: fuelEntries = [] } = useQuery({
    queryKey: ["fuel-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_entries").select("*").order("date", { ascending: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const { data: maintenances = [] } = useQuery({
    queryKey: ["maint-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*").order("date_entretien", { ascending: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });

  const range = useMemo(() => getDateRange(filter), [filter]);

  // Filtre les campagnes dont la date_debut tombe dans la plage choisie
  const filteredCampaigns = useMemo(() =>
    campaigns.filter(c => inRange(c.date_debut, range)),
    [campaigns, range]
  );

  const rows = useMemo(() => {
    return filteredCampaigns.map(camp => {
      const client = clients.find(c => c.id === camp.client_id);
      const campRotations = rotations.filter(r => r.campaign_id === camp.id && r.statut !== "annulee");
      const campVehicleIds = [...new Set(campRotations.map(r => r.vehicle_id))];

      const tonnage = campRotations.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
      const caHT = tonnage * prixTonne;
      const caTTC = caHT * (1 + tvaPct / 100);

      const campStart = camp.date_debut ? new Date(camp.date_debut) : null;
      const campEnd = camp.date_fin_prevue ? new Date(camp.date_fin_prevue) : new Date();

      const campFuel = fuelEntries.filter(f => {
        const fDate = f.date ? new Date(f.date) : null;
        return campVehicleIds.includes(f.vehicle_id) && fDate && (!campStart || fDate >= campStart) && fDate <= campEnd;
      });
      const coutCarburant = campFuel.reduce((s, f) => s + (Number(f.montant_total) || 0), 0);

      const campMaint = maintenances.filter(m => {
        const mDate = m.date_entretien ? new Date(m.date_entretien) : null;
        return campVehicleIds.includes(m.vehicle_id) && mDate && (!campStart || mDate >= campStart) && mDate <= campEnd;
      });
      const coutMaintenance = campMaint.reduce((s, m) => s + (Number(m.cout) || 0), 0);

      const campExpenses = expenses.filter(e => {
        const eDate = e.date_frais ? new Date(e.date_frais) : null;
        return campVehicleIds.includes(e.vehicle_id) && eDate && (!campStart || eDate >= campStart) && eDate <= campEnd;
      });
      const coutFrais = campExpenses.reduce((s, e) => s + (Number(e.montant) || 0), 0);

      const coutTotal = coutCarburant + coutMaintenance + coutFrais;
      const marge = caHT - coutTotal;
      const tauxMarge = caHT > 0 ? (marge / caHT) * 100 : null;

      return { ...camp, client, campRotations: campRotations.length, tonnage, caHT, caTTC, coutCarburant, coutMaintenance, coutFrais, coutTotal, marge, tauxMarge };
    }).sort((a, b) => new Date(b.date_debut || 0) - new Date(a.date_debut || 0));
  }, [filteredCampaigns, clients, rotations, fuelEntries, maintenances, expenses, prixTonne, tvaPct]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    caHT: acc.caHT + r.caHT,
    caTTC: acc.caTTC + r.caTTC,
    coutCarburant: acc.coutCarburant + r.coutCarburant,
    coutMaintenance: acc.coutMaintenance + r.coutMaintenance,
    coutFrais: acc.coutFrais + r.coutFrais,
    coutTotal: acc.coutTotal + r.coutTotal,
    marge: acc.marge + r.marge,
  }), { caHT: 0, caTTC: 0, coutCarburant: 0, coutMaintenance: 0, coutFrais: 0, coutTotal: 0, marge: 0 }), [rows]);

  const tauxMargeGlobal = totals.caHT > 0 ? (totals.marge / totals.caHT) * 100 : null;

  if (prixTonne === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm">Prix à la tonne non configuré. Rendez-vous dans <strong>Paramètres → Facturation campagnes</strong> pour définir le prix/tonne et la TVA.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtre */}
      <PeriodFilter filter={filter} onChange={setFilter} />

      {/* KPI globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "CA Total HT", value: fmt(totals.caHT) + " FCFA", color: "text-primary" },
          { label: "Dépenses totales", value: fmt(totals.coutTotal) + " FCFA", color: "text-destructive" },
          { label: "Marge brute", value: fmt(totals.marge) + " FCFA", color: totals.marge >= 0 ? "text-emerald-600" : "text-destructive" },
          { label: "Taux de marge", value: tauxMargeGlobal !== null ? tauxMargeGlobal.toFixed(1) + "%" : "—", color: (tauxMargeGlobal ?? 0) >= 0 ? "text-emerald-600" : "text-destructive" },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
        ℹ️ CA HT = tonnage réel × {fmt(prixTonne)} FCFA/T (TVA {tvaPct}%). Les dépenses sont imputées aux véhicules ayant participé à chaque campagne sur sa période.
      </p>

      {/* Tableau */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Rentabilité par campagne</h3>
          <span className="text-xs text-muted-foreground">{rows.length} campagne{rows.length > 1 ? "s" : ""}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Campagne</TableHead>
              <TableHead className="text-xs">Client</TableHead>
              <TableHead className="text-xs">Période</TableHead>
              <TableHead className="text-xs text-right">Rot.</TableHead>
              <TableHead className="text-xs text-right">Tonnage (T)</TableHead>
              <TableHead className="text-xs text-right">CA HT (FCFA)</TableHead>
              <TableHead className="text-xs text-right">Carburant</TableHead>
              <TableHead className="text-xs text-right">Maintenance</TableHead>
              <TableHead className="text-xs text-right">Frais divers</TableHead>
              <TableHead className="text-xs text-right">Dépenses tot.</TableHead>
              <TableHead className="text-xs text-right">Marge (FCFA)</TableHead>
              <TableHead className="text-xs text-center">Taux</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-xs text-muted-foreground py-8">Aucune campagne sur cette période.</TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row.id} className="hover:bg-muted/20">
                <TableCell className="text-xs font-medium max-w-[160px] truncate">{row.nom_campagne}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.client?.nom || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.date_debut)} → {fmtDate(row.date_fin_prevue)}</TableCell>
                <TableCell className="text-xs text-right">{row.campRotations}</TableCell>
                <TableCell className="text-xs text-right font-medium">{row.tonnage.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                <TableCell className="text-xs text-right font-bold text-primary">{fmt(row.caHT)}</TableCell>
                <TableCell className="text-xs text-right text-orange-600">{fmt(row.coutCarburant)}</TableCell>
                <TableCell className="text-xs text-right text-blue-600">{fmt(row.coutMaintenance)}</TableCell>
                <TableCell className="text-xs text-right text-muted-foreground">{fmt(row.coutFrais)}</TableCell>
                <TableCell className="text-xs text-right font-semibold text-destructive">{fmt(row.coutTotal)}</TableCell>
                <TableCell className={`text-xs text-right font-bold ${row.marge >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(row.marge)}</TableCell>
                <TableCell className="text-xs text-center"><MargeBadge taux={row.tauxMarge} /></TableCell>
              </TableRow>
            ))}
            {rows.length > 0 && (
              <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                <TableCell className="text-xs font-bold" colSpan={5}>TOTAL</TableCell>
                <TableCell className="text-xs text-right font-bold text-primary">{fmt(totals.caHT)}</TableCell>
                <TableCell className="text-xs text-right font-bold text-orange-600">{fmt(totals.coutCarburant)}</TableCell>
                <TableCell className="text-xs text-right font-bold text-blue-600">{fmt(totals.coutMaintenance)}</TableCell>
                <TableCell className="text-xs text-right font-bold text-muted-foreground">{fmt(totals.coutFrais)}</TableCell>
                <TableCell className="text-xs text-right font-bold text-destructive">{fmt(totals.coutTotal)}</TableCell>
                <TableCell className={`text-xs text-right font-bold ${totals.marge >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(totals.marge)}</TableCell>
                <TableCell className="text-xs text-center"><MargeBadge taux={tauxMargeGlobal} /></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}