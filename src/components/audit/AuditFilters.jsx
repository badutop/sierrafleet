import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

const actionLabels = { create: "Création", update: "Modification", delete: "Suppression" };

export default function AuditFilters({
  entities, actionFilter, setActionFilter, entityFilter, setEntityFilter,
  userFilter, setUserFilter, dateFilter, setDateFilter, onReset,
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Filtres</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Toutes les actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {Object.entries(actionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type d'entité</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Tous les types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Utilisateur</Label>
          <Input className="mt-1" placeholder="Email utilisateur..." value={userFilter} onChange={e => setUserFilter(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" className="mt-1" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        <RotateCcw className="w-3.5 h-3.5 mr-2" /> Réinitialiser les filtres
      </Button>
    </div>
  );
}