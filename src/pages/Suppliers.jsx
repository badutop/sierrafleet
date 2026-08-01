import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Building2, Factory, Pencil, Trash2, Phone, Mail, MapPin, ArrowLeft, Save, IdCard } from "lucide-react";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";
import { cn } from "@/lib/utils";

const emptyForm = { nom: "", telephone: "", email: "", adresse: "", actif: true };

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("suppliers").insert({ id: crypto.randomUUID(), ...data });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); closeDialog(); toast.success("Fournisseur ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("suppliers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); closeDialog(); toast.success("Fournisseur modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Factory className="w-6 h-6 text-secondary" />
            Fournisseurs
          </h1>
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
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id} className={cn(s.actif === false && "opacity-60")}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{s.nom}</span>
                        {s.actif === false && <Badge className="bg-muted text-muted-foreground text-[10px]">Inactif</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{s.telephone || "-"}</TableCell>
                    <TableCell className="text-xs">{s.adresse || "-"}</TableCell>
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
        <DialogContent className="max-w-lg [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
            <Factory className="w-5 h-5 text-secondary shrink-0" />
            <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
              {editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {editingSupplier ? "Mettez à jour les informations de ce fournisseur" : "Renseignez les informations du nouveau fournisseur"}
          </p>

          <div className="space-y-3 mt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" />Identification</p>
              <div>
                <Label className="text-xs">Nom du fournisseur *</Label>
                <Input className="mt-1" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="ex: Pièces Auto Dakar" />
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Coordonnées</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Téléphone</Label>
                  <Input className="mt-1 bg-card" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 123 45 67" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
                  <Input className="mt-1 bg-card" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@fournisseur.sn" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Adresse</Label>
                  <Input className="mt-1 bg-card" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="123 Rue du Commerce, Dakar" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/40 border border-border rounded-2xl p-4">
              <div>
                <Label className="text-xs">Fournisseur actif</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">Un fournisseur inactif n'apparaît plus dans la liste pour lancer une nouvelle commande</p>
              </div>
              <Switch checked={form.actif !== false} onCheckedChange={v => setForm({ ...form, actif: v })} />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={closeDialog}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave} disabled={isPending || !form.nom.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}