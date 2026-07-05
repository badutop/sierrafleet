import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search } from "lucide-react";
import { format } from "date-fns";

const actionLabels = { create: "Création", update: "Modification", delete: "Suppression" };
const actionColors = {
  create: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-blue-100 text-blue-700 border-blue-200",
  delete: "bg-red-100 text-red-700 border-red-200",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
  });

  const entities = [...new Set(logs.map(l => l.entity_name))].sort();

  const filtered = logs.filter(l => {
    const matchesSearch =
      l.summary?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_id?.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entityFilter === "all" || l.entity_name === entityFilter;
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    return matchesSearch && matchesEntity && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-secondary" />
          Journal d'Audit
        </h1>
        <p className="text-sm text-muted-foreground">{logs.length} évènements enregistrés</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par utilisateur, ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Entité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            <SelectItem value="create">Création</SelectItem>
            <SelectItem value="update">Modification</SelectItem>
            <SelectItem value="delete">Suppression</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Résumé</TableHead>
                  <TableHead>Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {log.created_date ? format(new Date(log.created_date), "dd/MM/yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.entity_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${actionColors[log.action] || ""}`}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.summary}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.user_email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun évènement trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}