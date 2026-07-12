import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Download, Clock, User } from "lucide-react";
import { format } from "date-fns";
import AuditStatCards from "@/components/audit/AuditStatCards";
import AuditFilters from "@/components/audit/AuditFilters";

const actionLabels = { create: "Création", update: "Modification", delete: "Suppression" };
const actionColors = {
  create: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-blue-100 text-blue-700 border-blue-200",
  delete: "bg-red-100 text-red-700 border-red-200",
};

function toCsv(rows) {
  const headers = ["Date", "Action", "Entité", "ID Entité", "Utilisateur", "Détails"];
  const lines = rows.map(l => [
    l.created_date ? format(new Date(l.created_date), "dd/MM/yyyy HH:mm:ss") : "",
    actionLabels[l.action] || l.action,
    l.entity_name,
    l.entity_id,
    l.user_email,
    (l.summary || "").replace(/[\n,]/g, " "),
  ].join(","));
  return [headers.join(","), ...lines].join("\n");
}

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const entities = useMemo(() => [...new Set(logs.map(l => l.entity_name).filter(Boolean))].sort(), [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const matchesEntity = entityFilter === "all" || l.entity_name === entityFilter;
    const matchesUser = !userFilter || l.user_email?.toLowerCase().includes(userFilter.toLowerCase());
    const matchesDate = !dateFilter || (l.created_date && l.created_date.slice(0, 10) === dateFilter);
    return matchesAction && matchesEntity && matchesUser && matchesDate;
  }), [logs, actionFilter, entityFilter, userFilter, dateFilter]);

  const handleReset = () => {
    setActionFilter("all"); setEntityFilter("all"); setUserFilter(""); setDateFilter("");
  };

  const handleExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal_audit_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-secondary" />
            Journal d'Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Traçabilité complète des actions dans le système</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Exporter CSV
        </Button>
      </div>

      <AuditStatCards logs={logs} filteredCount={filtered.length} />

      <AuditFilters
        entities={entities}
        actionFilter={actionFilter} setActionFilter={setActionFilter}
        entityFilter={entityFilter} setEntityFilter={setEntityFilter}
        userFilter={userFilter} setUserFilter={setUserFilter}
        dateFilter={dateFilter} setDateFilter={setDateFilter}
        onReset={handleReset}
      />

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Historique des actions ({filtered.length})</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="font-medium">{log.created_date ? format(new Date(log.created_date), "dd/MM/yyyy") : "-"}</div>
                            <div className="text-muted-foreground">{log.created_date ? format(new Date(log.created_date), "HH:mm:ss") : ""}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${actionColors[log.action] || ""}`}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {log.user_email}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{log.entity_name}</div>
                        {log.entity_id && <div className="text-muted-foreground font-mono text-[10px]">{log.entity_id.slice(0, 10)}...</div>}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{log.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun évènement trouvé</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}