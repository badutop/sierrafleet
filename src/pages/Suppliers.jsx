import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Building2, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = { nom: "", telephone: "", email: "", adresse: "", actif: true };

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); closeDialog(); toast.success("Fournisseur ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); closeDialog(); toast.success("Fournisseur modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Fournisseur supprimé"); },
  });

  const openCreate = () => { setEditingSupplier(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s) => { setEditingSupplier(s); setForm({ ...emptyForm, ...s }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingSupplier(null); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    if (editingSupplier) updateMutation.mutate({ id: editingSupplier.id, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = (s) => {
    if (confirm(`Supprimer le fournisseur "${s.nom}" ?`)) deleteMutation.mutate(s.id);
  };

  const filtered = suppliers.filter(s =>
    s.nom?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.telephone?.includes(search)
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fournisseurs</h1>
          <p className="text-sm text-muted-foreground">{suppliers.length} fournisseurs registrés</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, email ou téléphone..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{s.nom}</CardTitle>
                    </div>
                  </div>
                  {s.actif && <Badge variant="default" className="text-[10px] shrink-0">Actif</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {s.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-muted-foreground" /><span className="truncate">{s.email}</span></div>}
                {s.telephone && <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-muted-foreground" /><span>{s.telephone}</span></div>}
                {s.adresse && <div className="flex items-start gap-2"><MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" /><span className="truncate">{s.adresse}</span></div>}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(s)}>
                    <Pencil className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun fournisseur trouvé</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2">
              <Label className="text-xs">Nom du fournisseur *</Label>
              <Input className="mt-1" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="ex: Pièces Auto Dakar" />
            </div>
            <div>
              <Label className="text-xs">Téléphone</Label>
              <Input className="mt-1" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 123 45 67" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@fournisseur.sn" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Adresse</Label>
              <Input className="mt-1" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="123 Rue du Commerce, Dakar" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending || !form.nom.trim()}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}