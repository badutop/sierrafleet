import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Building2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";

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

  const handleDelete = async (s) => {
    if (await confirm(`Supprimer le fournisseur "${s.nom}" ?`)) deleteMutation.mutate(s.id);
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, email ou téléphone..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{s.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{s.email || "-"}</TableCell>
                    <TableCell className="text-xs">{s.telephone || "-"}</TableCell>
                    <TableCell>{s.actif && <Badge variant="default" className="text-[10px]">Actif</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(s)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)} disabled={deleteMutation.isPending}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun fournisseur trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
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