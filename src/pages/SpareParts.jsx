import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Package, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categorieLabels = { moteur: "Moteur", freinage: "Freinage", suspension: "Suspension", transmission: "Transmission", electricite: "Électricité", carrosserie: "Carrosserie", filtres: "Filtres", pneumatiques: "Pneumatiques", autre: "Autre" };
const categorieColors = { moteur: "bg-red-500/10 text-red-600", freinage: "bg-orange-500/10 text-orange-600", suspension: "bg-yellow-500/10 text-yellow-700", transmission: "bg-blue-500/10 text-blue-600", electricite: "bg-purple-500/10 text-purple-600", carrosserie: "bg-slate-500/10 text-slate-600", filtres: "bg-green-500/10 text-green-600", pneumatiques: "bg-cyan-500/10 text-cyan-600", autre: "bg-muted text-muted-foreground" };

const emptyForm = { reference: "", designation: "", categorie: "autre", marque_vehicule: "", quantite_stock: "", quantite_min: "1", prix_unitaire: "", fournisseur: "", localisation: "", notes: "" };

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const isLow = (p.quantite_stock || 0) <= (p.quantite_min || 1);
            return (
              <Card key={p.id} className={cn("hover:shadow-lg transition-shadow", isLow && "border-amber-400/50")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{p.designation}</CardTitle>
                        {p.reference && <p className="text-xs text-muted-foreground">Réf: {p.reference}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      <Badge className={cn("text-[10px]", categorieColors[p.categorie])}>{categorieLabels[p.categorie]}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock</span>
                    <span className={cn("font-semibold", isLow ? "text-amber-600" : "text-emerald-600")}>{p.quantite_stock || 0} unité(s)</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Seuil min.</span><span className="font-medium">{p.quantite_min || 1}</span></div>
                  {p.prix_unitaire > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Prix unitaire</span><span className="font-medium">{p.prix_unitaire?.toLocaleString("fr-FR")} FCFA</span></div>}
                  {p.fournisseur && <div className="flex justify-between"><span className="text-muted-foreground">Fournisseur</span><span className="font-medium truncate ml-2">{p.fournisseur}</span></div>}
                  {p.localisation && <div className="flex justify-between"><span className="text-muted-foreground">Localisation</span><span className="font-medium">{p.localisation}</span></div>}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(p)}>
                      <Pencil className="w-3 h-3 mr-1" /> Modifier
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p)} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune pièce trouvée</p>
            </div>
          )}
        </div>
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
            <div><Label className="text-xs">Stock actuel</Label><Input type="number" className="mt-1" value={form.quantite_stock} onChange={e => setForm({ ...form, quantite_stock: e.target.value })} /></div>
            <div><Label className="text-xs">Seuil min.</Label><Input type="number" className="mt-1" value={form.quantite_min} onChange={e => setForm({ ...form, quantite_min: e.target.value })} /></div>
            <div><Label className="text-xs">Prix unitaire (FCFA)</Label><Input type="number" className="mt-1" value={form.prix_unitaire} onChange={e => setForm({ ...form, prix_unitaire: e.target.value })} /></div>
            <div><Label className="text-xs">Fournisseur</Label><Input className="mt-1" value={form.fournisseur} onChange={e => setForm({ ...form, fournisseur: e.target.value })} /></div>
            <div><Label className="text-xs">Véhicule(s) compatible(s)</Label><Input className="mt-1" value={form.marque_vehicule} onChange={e => setForm({ ...form, marque_vehicule: e.target.value })} /></div>
            <div><Label className="text-xs">Localisation garage</Label><Input className="mt-1" value={form.localisation} onChange={e => setForm({ ...form, localisation: e.target.value })} /></div>
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