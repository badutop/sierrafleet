import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categorieLabels = { moteur: "Moteur", freinage: "Freinage", suspension: "Suspension", transmission: "Transmission", electricite: "Électricité", carrosserie: "Carrosserie", filtres: "Filtres", pneumatiques: "Pneumatiques", autre: "Autre" };
const categorieColors = { moteur: "bg-red-500/10 text-red-600", freinage: "bg-orange-500/10 text-orange-600", suspension: "bg-yellow-500/10 text-yellow-700", transmission: "bg-blue-500/10 text-blue-600", electricite: "bg-purple-500/10 text-purple-600", carrosserie: "bg-slate-500/10 text-slate-600", filtres: "bg-green-500/10 text-green-600", pneumatiques: "bg-cyan-500/10 text-cyan-600", autre: "bg-muted text-muted-foreground" };
const etatLabels = { neuve: "Neuve", occasion: "Occasion", reconditionnee: "Reconditionée", degats: "Dégâts" };
const etatColors = { neuve: "bg-green-500/10 text-green-700", occasion: "bg-blue-500/10 text-blue-700", reconditionnee: "bg-amber-500/10 text-amber-700", degats: "bg-red-500/10 text-red-700" };

const emptyForm = { reference: "", designation: "", categorie: "autre", etat: "neuve", quantite_stock: "", quantite_min: "1", prix_unitaire: "", supplier_id: "", notes: "" };

export default function SpareParts() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["spareParts"],
    queryFn: () => base44.entities.SparePart.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SparePart.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["spareParts"] }); closeDialog(); toast.success("Pièce ajoutée"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SparePart.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["spareParts"] }); closeDialog(); toast.success("Pièce modifiée"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SparePart.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["spareParts"] }); toast.success("Pièce supprimée"); },
  });

  const openCreate = () => { setEditingPart(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p) => { setEditingPart(p); setForm({ ...emptyForm, ...p }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingPart(null); setForm(emptyForm); };

  const handleSave = () => {
    const data = { ...form, quantite_stock: Number(form.quantite_stock || 0), quantite_min: Number(form.quantite_min || 1), prix_unitaire: Number(form.prix_unitaire || 0) };
    if (editingPart) updateMutation.mutate({ id: editingPart.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = (p) => {
    if (confirm(`Supprimer la pièce "${p.designation}" ?`)) deleteMutation.mutate(p.id);
  };

  const filtered = parts.filter(p => {
    const matchSearch = p.designation?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || p.categorie === filterCat;
    return matchSearch && matchCat;
  });

  const lowStock = parts.filter(p => (p.quantite_stock || 0) <= (p.quantite_min || 1)).length;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pièces Détachées</h1>
          <p className="text-sm text-muted-foreground">{parts.length} références en stock{lowStock > 0 && <span className="text-amber-600 ml-2">· {lowStock} en rupture</span>}</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par désignation ou référence..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(categorieLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <TableHead>Pièce</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const isLow = (p.quantite_stock || 0) <= (p.quantite_min || 1);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{p.designation}</div>
                            {p.reference && <div className="text-xs text-muted-foreground">Réf: {p.reference}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={cn("text-[10px]", categorieColors[p.categorie])}>{categorieLabels[p.categorie]}</Badge></TableCell>
                      <TableCell>{p.etat && <Badge className={cn("text-[10px]", etatColors[p.etat])}>{etatLabels[p.etat]}</Badge>}</TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-semibold", isLow ? "text-amber-600" : "text-emerald-600")}>{p.quantite_stock || 0} unité(s)</span>
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1" />}
                      </TableCell>
                      <TableCell className="text-xs">{p.prix_unitaire > 0 ? `${p.prix_unitaire?.toLocaleString("fr-FR")} FCFA` : "-"}</TableCell>
                      <TableCell className="text-xs">{suppliers.find(s => s.id === p.supplier_id)?.nom || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(p)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p)} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucune pièce trouvée</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPart ? "Modifier la pièce" : "Nouvelle pièce détachée"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2">
              <Label className="text-xs">Désignation *</Label>
              <Input className="mt-1" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
            </div>
            <div><Label className="text-xs">Référence</Label><Input className="mt-1" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Select value={form.categorie} onValueChange={v => setForm({ ...form, categorie: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(categorieLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">État</Label>
              <Select value={form.etat} onValueChange={v => setForm({ ...form, etat: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(etatLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Stock actuel</Label><Input type="number" className="mt-1" value={form.quantite_stock} onChange={e => setForm({ ...form, quantite_stock: e.target.value })} /></div>
            <div><Label className="text-xs">Seuil min.</Label><Input type="number" className="mt-1" value={form.quantite_min} onChange={e => setForm({ ...form, quantite_min: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Prix unitaire (FCFA)</Label><Input type="number" className="mt-1" value={form.prix_unitaire} onChange={e => setForm({ ...form, prix_unitaire: e.target.value })} /></div>
            <div className="col-span-2">
              <Label className="text-xs">Fournisseur</Label>
              <Select value={form.supplier_id || ""} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un fournisseur..." /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Input className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending || !form.designation}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}