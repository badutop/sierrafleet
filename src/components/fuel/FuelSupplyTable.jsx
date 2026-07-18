import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Zap, Search, Eye, X } from "lucide-react";

const statutLabels = { en_attente: "En attente", valide: "Validé", rejete: "Rejeté" };
const statutColors = { en_attente: "bg-amber-500/10 text-amber-600", valide: "bg-emerald-500/10 text-emerald-600", rejete: "bg-destructive/10 text-destructive" };

// Fiche de consultation en lecture seule pour un rechargement automatique —
// une fois la prise effective réalisée, il ne doit plus être possible de le
// modifier ou de le supprimer (preuve/scan déjà liés), seulement de le consulter.
function FuelEntryDetailSheet({ entry, vehicle, onClose }) {
  const statut = entry.statut || "en_attente";
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-primary text-primary-foreground">
          <span className="font-bold text-sm flex items-center gap-1.5"><Zap className="w-4 h-4 text-secondary" /> Rechargement automatique</span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {entry.recu_url && (
            <img src={entry.recu_url} alt="Photo de la pompe" className="w-full h-36 object-cover rounded-lg border" />
          )}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Véhicule</span><span className="font-mono font-semibold">{vehicle?.immatriculation || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{entry.date || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Station</span><span className="font-medium text-right">{entry.station || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Litres</span><span className="font-bold">{(entry.litres || 0).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{(entry.montant_total || 0).toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut</span><Badge className={`text-[10px] ${statutColors[statut]}`}>{statutLabels[statut]}</Badge></div>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            Rechargement effectué et scans déjà liés — consultation uniquement.
          </p>
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}

export default function FuelSupplyTable({ entries, isLoading, vMap, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "auto" | "manuel"
  const [viewEntry, setViewEntry] = useState(null);

  const filtered = entries.filter(e => {
    const isAuto = e.station?.startsWith("Refuel auto");
    if (filter === "auto" && !isAuto) return false;
    if (filter === "manuel" && isAuto) return false;
    const immat = vMap[e.vehicle_id]?.immatriculation || "";
    const station = e.station || "";
    return (
      immat.toLowerCase().includes(search.toLowerCase()) ||
      station.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par véhicule, station..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {[["all", "Tous"], ["auto", "Automatiques"], ["manuel", "Manuels"]].map(([val, label]) => (
            <Button
              key={val}
              variant={filter === val ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(val)}
              className={filter === val ? "bg-primary" : ""}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Véhicule</TableHead>
              <TableHead className="text-xs">Station / Source</TableHead>
              <TableHead className="text-xs text-right">Litres</TableHead>
              <TableHead className="text-xs text-right">Prix/L (FCFA)</TableHead>
              <TableHead className="text-xs text-right">Montant (FCFA)</TableHead>
              <TableHead className="text-xs text-center">Type</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  Aucun enregistrement trouvé
                </TableCell>
              </TableRow>
            ) : filtered.slice(0, 100).map(e => {
              const isAuto = e.station?.startsWith("Refuel auto");
              const vehicle = vMap[e.vehicle_id];
              return (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{e.date}</TableCell>
                  <TableCell className="text-xs font-semibold font-mono">
                    {vehicle?.immatriculation || "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={e.station}>
                    {e.station || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {(e.litres || 0).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {e.prix_litre ? e.prix_litre.toLocaleString("fr-FR") : <span className="text-muted-foreground italic">N/A</span>}
                  </TableCell>
                  <TableCell className="text-xs text-right font-bold">
                    {(e.montant_total || 0).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-center">
                    {isAuto ? (
                      <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/30 text-[10px] gap-1">
                        <Zap className="w-2.5 h-2.5" /> Auto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Manuel</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {isAuto ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewEntry(e)} title="Consulter">
                          <Eye className="w-3 h-3" />
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(e)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(e.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {viewEntry && (
        <FuelEntryDetailSheet entry={viewEntry} vehicle={vMap[viewEntry.vehicle_id]} onClose={() => setViewEntry(null)} />
      )}
    </div>
  );
}