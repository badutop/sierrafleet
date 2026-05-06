import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import MaintenanceStatusStepper from "./MaintenanceStatusStepper";
import MaintenanceValidationPanel from "./MaintenanceValidationPanel";

const typeLabels = {
  vidange: "Vidange", revision: "Révision", pneus: "Pneus", filtres: "Filtres",
  freins: "Freins", controle_technique: "CT", assurance: "Assurance",
  panne_moteur: "Panne moteur", panne_electricite: "Panne élec.",
  panne_transmission: "Panne transm.", carrosserie: "Carrosserie", autre: "Autre",
};

const statutColors = {
  planifie: "bg-blue-500/15 text-blue-700 border-blue-400/30",
  en_cours: "bg-amber-500/15 text-amber-700 border-amber-400/30",
  realise: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
  annule: "bg-muted text-muted-foreground",
};

const graviteColors = {
  faible: "bg-emerald-500/15 text-emerald-700",
  moyenne: "bg-amber-500/15 text-amber-700",
  elevee: "bg-orange-500/15 text-orange-700",
  critique: "bg-destructive/15 text-destructive",
};

export default function MaintenanceListTab({ maintenances, isLoading, vMap, onEdit, onDelete, onStatusChange, isPending }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");

  const filtered = maintenances.filter(m => {
    if (filterCat !== "all" && m.categorie !== filterCat) return false;
    if (filterStatut !== "all" && m.statut !== filterStatut) return false;
    const immat = vMap[m.vehicle_id]?.immatriculation || "";
    const desig = m.designation || "";
    const prest = m.prestataire || "";
    return (immat + desig + prest).toLowerCase().includes(search.toLowerCase());
  });

  const activeOnes = maintenances.filter(m => m.statut === "planifie" || m.statut === "en_cours");

  return (
    <div className="space-y-4">
      {/* Section validation Chef de garage — toujours visible */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Panneau Chef de garage — Interventions à valider
          <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">
            {activeOnes.length} en attente
          </span>
        </h3>
        {activeOnes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            ✅ Aucune intervention en attente de validation.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeOnes.map(m => (
              <MaintenanceValidationPanel
                key={m.id}
                maintenance={m}
                onStatusChange={onStatusChange}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher véhicule, désignation, prestataire..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[["all","Tout"],["preventive","Préventive"],["corrective","Corrective"]].map(([v,l]) => (
            <Button key={v} size="sm" variant={filterCat === v ? "default" : "outline"} onClick={() => setFilterCat(v)} className={filterCat === v ? "bg-primary text-xs" : "text-xs"}>{l}</Button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {[["all","Tous statuts"],["planifie","Prévu"],["en_cours","En cours"],["realise","Réalisé"]].map(([v,l]) => (
            <Button key={v} size="sm" variant={filterStatut === v ? "default" : "outline"} onClick={() => setFilterStatut(v)} className={filterStatut === v ? "bg-primary text-xs" : "text-xs"}>{l}</Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Véhicule</TableHead>
              <TableHead className="text-xs">Catégorie</TableHead>
              <TableHead className="text-xs">Type / Désignation</TableHead>
              <TableHead className="text-xs">Prestataire</TableHead>
              <TableHead className="text-xs">Pièces</TableHead>
              <TableHead className="text-xs text-right">Coût (FCFA)</TableHead>
              <TableHead className="text-xs text-center">Statut</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">Aucune intervention trouvée</TableCell></TableRow>
            ) : filtered.slice(0, 100).map(m => {
              const vehicle = vMap[m.vehicle_id];
              return (
                <TableRow key={m.id} className={cn("hover:bg-muted/30", m.categorie === "corrective" && m.gravite === "critique" && "bg-destructive/5")}>
                  <TableCell className="text-xs">{m.date_entretien}</TableCell>
                  <TableCell className="text-xs font-semibold font-mono">
                    {vehicle?.code_camion && <span className="text-[10px] bg-primary/10 text-primary font-bold px-1 rounded mr-1">{vehicle.code_camion}</span>}
                    {vehicle?.immatriculation || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {m.categorie === "corrective"
                      ? <Badge className={cn("text-[10px]", m.gravite ? graviteColors[m.gravite] : "bg-destructive/15 text-destructive")}>🚨 Corrective</Badge>
                      : <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">🔧 Préventive</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{typeLabels[m.type_entretien] || m.type_entretien}</div>
                    {m.designation && <div className="text-muted-foreground text-[11px]">{m.designation}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{m.prestataire || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate" title={m.pieces_remplacees}>{m.pieces_remplacees || "—"}</TableCell>
                  <TableCell className="text-xs text-right font-bold">{(m.cout || 0).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-center">
                    <MaintenanceStatusStepper statut={m.statut} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(m)} title="Voir détails"><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}