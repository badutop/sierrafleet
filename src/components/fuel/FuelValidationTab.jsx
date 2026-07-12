import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Clock, Search, Fuel, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig = {
  en_attente: { label: "En attente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  valide: { label: "Validé", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  rejete: { label: "Rejeté", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

export default function FuelValidationTab({ entries, vMap, onEdit }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("tous");
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }) => {
      const { error } = await supabase.from("fuel_entries").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      toast.success("Statut mis à jour");
    },
  });

  const filtered = entries.filter(e => {
    const vehicle = vMap[e.vehicle_id];
    const matchSearch = !search ||
      vehicle?.immatriculation?.toLowerCase().includes(search.toLowerCase()) ||
      e.station?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "tous" || (e.statut || "en_attente") === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    tous: entries.length,
    en_attente: entries.filter(e => !e.statut || e.statut === "en_attente").length,
    valide: entries.filter(e => e.statut === "valide").length,
    rejete: entries.filter(e => e.statut === "rejete").length,
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Rechercher par véhicule, station..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "tous", label: "Tous" },
            { key: "en_attente", label: "En attente" },
            { key: "valide", label: "Validés" },
            { key: "rejete", label: "Rejetés" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={filterStatus === key ? "default" : "outline"}
              className="text-xs h-8"
              onClick={() => setFilterStatus(key)}
            >
              {label}
              <span className="ml-1 opacity-70">({counts[key]})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Aucun approvisionnement trouvé</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const vehicle = vMap[entry.vehicle_id];
            const statut = entry.statut || "en_attente";
            const cfg = statusConfig[statut] || statusConfig.en_attente;
            const Icon = cfg.icon;
            const isPending = updateStatusMutation.isPending;

            return (
              <Card key={entry.id} className="border">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Info principale */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                        <Fuel className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{vehicle?.immatriculation || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.date ? format(new Date(entry.date), "d MMM yyyy", { locale: fr }) : "—"}
                          {entry.station ? ` · ${entry.station}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Métriques */}
                    <div className="flex gap-4 text-sm shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Litres</p>
                        <p className="font-bold">{entry.litres ?? "—"} L</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Montant</p>
                        <p className="font-bold text-secondary">{formatCFA(entry.montant_total)}</p>
                      </div>
                    </div>

                    {/* Statut + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>

                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(entry)} disabled={isPending}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      {statut !== "valide" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, statut: "valide" })}
                          disabled={isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider
                        </Button>
                      )}
                      {statut !== "rejete" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, statut: "rejete" })}
                          disabled={isPending}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeter
                        </Button>
                      )}
                      {statut !== "en_attente" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground px-2"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, statut: "en_attente" })}
                          disabled={isPending}
                        >
                          Réinitialiser
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}