import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Receipt, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ExpenseValidationPanel from "@/components/expenses/ExpenseValidationPanel";

const typeLabels = { carburant: "Carburant", peage: "Péage", rations: "Rations", contravention: "Contravention", transport: "Transport", autre: "Autre" };
const typeColors = { carburant: "bg-orange-500/10 text-orange-600", peage: "bg-blue-500/10 text-blue-600", rations: "bg-green-500/10 text-green-600", contravention: "bg-red-500/10 text-red-600", transport: "bg-purple-500/10 text-purple-600", autre: "bg-muted text-muted-foreground" };
const statutLabels = { en_attente: "En attente", valide: "Validé", rejete: "Rejeté" };
const statutColors = { en_attente: "bg-amber-500/10 text-amber-600", valide: "bg-emerald-500/10 text-emerald-600", rejete: "bg-destructive/10 text-destructive" };

const emptyForm = { vehicle_id: "", driver_id: "", type_frais: "carburant", date_frais: "", montant: "", description: "", statut: "en_attente" };

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date_frais", 200) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); closeDialog(); toast.success("Frais ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); closeDialog(); toast.success("Frais modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Frais supprimé"); },
  });

  const openCreate = () => { setEditingExpense(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e) => { setEditingExpense(e); setForm({ ...emptyForm, ...e }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingExpense(null); setForm(emptyForm); };

  const handleSave = () => {
    const data = { ...form, montant: Number(form.montant || 0), statut: editingExpense ? form.statut : "en_attente" };
    if (editingExpense) updateMutation.mutate({ id: editingExpense.id, data });
    else createMutation.mutate(data);
  };

  const handleValidate = (id) => {
    updateMutation.mutate({ id, data: { statut: "valide" } });
    toast.success("Frais validé");
  };

  const handleReject = (id) => {
    updateMutation.mutate({ id, data: { statut: "rejete" } });
    toast.error("Frais rejeté");
  };

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v.immatriculation]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));

  const filtered = expenses.filter(e => {
    const matchSearch = e.description?.toLowerCase().includes(search.toLowerCase()) || vehicleMap[e.vehicle_id]?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || e.type_frais === filterType;
    const matchStatut = filterStatut === "all" || e.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  const totalFiltred = filtered.reduce((s, e) => s + (e.montant || 0), 0);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Frais</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entrées · Total: {totalFiltred.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(statutLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Aucun frais enregistré</p>
          </div>
        ) : (
          filtered.map(e => (
            <div key={e.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                      <p className="font-medium">{e.date_frais}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                      <Badge className={cn("text-[10px]", typeColors[e.type_frais])}>{typeLabels[e.type_frais]}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Véhicule</p>
                      <p className="font-medium">{vehicleMap[e.vehicle_id] || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Chauffeur</p>
                      <p className="font-medium">{driverMap[e.driver_id] || "-"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Montant</p>
                    <p className="text-lg font-bold text-secondary">{(e.montant || 0).toLocaleString("fr-FR")} FCFA</p>
                  </div>
                </div>
                {e.description && <p className="text-xs text-muted-foreground mt-2">Description: {e.description}</p>}
              </div>
              <div className="p-4 space-y-3">
                <ExpenseValidationPanel expense={e} onValidate={handleValidate} onReject={handleReject} isPending={updateMutation.isPending} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEdit(e)}>
                    <Pencil className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Supprimer ce frais ?")) deleteMutation.mutate(e.id); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingExpense ? "Modifier le frais" : "Nouveau frais"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-xs">Type de frais *</Label>
              <Select value={form.type_frais} onValueChange={v => setForm({ ...form, type_frais: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Date *</Label><Input type="date" className="mt-1" value={form.date_frais} onChange={e => setForm({ ...form, date_frais: e.target.value })} /></div>
            <div><Label className="text-xs">Montant (FCFA) *</Label><Input type="number" className="mt-1" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} /></div>
            {editingExpense && (
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statutLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            )}
            <div>
              <Label className="text-xs">Véhicule</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Aucun --</SelectItem>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Chauffeur</Label>
              <Select value={form.driver_id || "none"} onValueChange={v => setForm({ ...form, driver_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Aucun --</SelectItem>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Input className="mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending || !form.montant || !form.date_frais}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}