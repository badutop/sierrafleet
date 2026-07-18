import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, TrendingUp, TrendingDown, Scale, Search } from "lucide-react";
import PeriodFilter, { getDateRange, inRange } from "@/components/reports/PeriodFilter";
import { buildDeversementLines } from "@/lib/ohadaMapping";

const now = new Date();
const defaultFilter = { mode: "month", month: now.getMonth() + 1, year: now.getFullYear(), from: "", to: "" };

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

export default function DeversementPage() {
  const [filter, setFilter] = useState(defaultFilter);
  const [natureFilter, setNatureFilter] = useState("all"); // all | Charge | Produit
  const [search, setSearch] = useState("");

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: fuelEntries = [] } = useQuery({
    queryKey: ["fuel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_entries").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*");
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
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
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

  const allLines = useMemo(
    () => buildDeversementLines({ expenses, maintenances, fuelEntries, rotations, campaigns, clients, vehicles }),
    [expenses, maintenances, fuelEntries, rotations, campaigns, clients, vehicles]
  );

  const range = useMemo(() => getDateRange(filter), [filter]);

  const lines = useMemo(() => {
    return allLines.filter(l => {
      if (!inRange(l.date, range)) return false;
      if (natureFilter !== "all" && l.nature !== natureFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${l.compte.code} ${l.compte.libelle} ${l.categorie} ${l.description} ${l.source}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [allLines, range, natureFilter, search]);

  const totalCharges = useMemo(() => lines.filter(l => l.nature === "Charge").reduce((s, l) => s + l.montant, 0), [lines]);
  const totalProduits = useMemo(() => lines.filter(l => l.nature === "Produit").reduce((s, l) => s + l.montant, 0), [lines]);
  const resultat = totalProduits - totalCharges;

  // Regroupement par compte OHADA (façon grand livre) pour l'affichage
  const groupedByCompte = useMemo(() => {
    const groups = new Map();
    lines.forEach(l => {
      const key = l.compte.code;
      if (!groups.has(key)) groups.set(key, { compte: l.compte, nature: l.nature, lines: [], total: 0 });
      const g = groups.get(key);
      g.lines.push(l);
      g.total += l.montant;
    });
    return Array.from(groups.values()).sort((a, b) => a.compte.code.localeCompare(b.compte.code));
  }, [lines]);

  const handleExportExcel = () => {
    const rows = lines.map(l => ({
      "Date": l.date,
      "N° Compte": l.compte.code,
      "Libellé compte": l.compte.libelle,
      "Nature": l.nature,
      "Catégorie": l.categorie,
      "Description": l.description,
      "Débit (FCFA)": l.nature === "Charge" ? Math.round(l.montant) : "",
      "Crédit (FCFA)": l.nature === "Produit" ? Math.round(l.montant) : "",
      "Source": l.source,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 32 }, { wch: 10 }, { wch: 20 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Déversement OHADA");
    const label = filter.mode === "all" ? "tout" : new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Deversement-OHADA-${label}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-secondary" />
            Déversement comptable
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Toutes les charges et tous les revenus générés, organisés selon le plan comptable SYSCOHADA
          </p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleExportExcel} disabled={lines.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter Excel
        </Button>
      </div>

      <PeriodFilter filter={filter} onChange={setFilter} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total charges</p>
              <p className="text-xl font-bold mt-1 text-destructive">{formatCFA(totalCharges)}</p>
            </div>
            <TrendingDown className="w-7 h-7 text-destructive opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total produits</p>
              <p className="text-xl font-bold mt-1 text-emerald-600">{formatCFA(totalProduits)}</p>
            </div>
            <TrendingUp className="w-7 h-7 text-emerald-600 opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Résultat net</p>
              <p className={`text-xl font-bold mt-1 ${resultat >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCFA(resultat)}</p>
            </div>
            <Scale className="w-7 h-7 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* Filtres secondaires */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Rechercher par compte, catégorie, description..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {[["all", "Tous"], ["Charge", "Charges"], ["Produit", "Produits"]].map(([v, l]) => (
            <Button key={v} size="sm" variant={natureFilter === v ? "default" : "outline"} className="h-9 text-xs" onClick={() => setNatureFilter(v)}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      {/* Grand livre par compte */}
      {groupedByCompte.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune écriture pour cette période</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByCompte.map(group => (
            <div key={group.compte.code}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {group.compte.code} — {group.compte.libelle}
                </h3>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-secondary">{group.lines.length} écriture{group.lines.length > 1 ? "s" : ""}</span> — {formatCFA(group.total)}
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Catégorie</TableHead>
                      <TableHead className="font-bold">Description</TableHead>
                      <TableHead className="font-bold">Source</TableHead>
                      <TableHead className="text-right font-bold">Débit</TableHead>
                      <TableHead className="text-right font-bold">Crédit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{l.date || "—"}</TableCell>
                        <TableCell className="text-xs">{l.categorie}</TableCell>
                        <TableCell className="text-xs max-w-[280px] truncate" title={l.description}>{l.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.source}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-destructive">{l.nature === "Charge" ? formatCFA(l.montant) : ""}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-600">{l.nature === "Produit" ? formatCFA(l.montant) : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
