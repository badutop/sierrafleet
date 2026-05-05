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
import { Plus, Building2, MapPin, Phone, Pencil, Trash2, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const zoneLabels = { zone1: "Zone 1", zone2: "Zone 2", zone3: "Zone 3", zone4: "Zone 4" };
const zoneColors = { zone1: "bg-green-500/10 text-green-600", zone2: "bg-blue-500/10 text-blue-600", zone3: "bg-amber-500/10 text-amber-600", zone4: "bg-red-500/10 text-red-600" };
const zoneConso = { zone1: "8–10 L", zone2: "25 L", zone3: "30 L", zone4: "40 L" };
const zoneConsoVal = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };

const emptyForm = { nom: "", code_client: "", zone: "zone1", adresse_depot: "", contact_nom: "", contact_telephone: "", actif: true };

export default function ClientsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); toast.success("Client ajouté"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); toast.success("Client modifié"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client supprimé"); },
  });

  const openCreate = () => { setEditingClient(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => { setEditingClient(c); setForm({ ...emptyForm, ...c }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingClient(null); setForm(emptyForm); };

  const handleSave = () => {
    const data = { ...form, consommation_estimee_litres: zoneConsoVal[form.zone] };
    if (editingClient) updateMutation.mutate({ id: editingClient.id, data });
    else createMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.filter(c => c.actif !== false).length} clients actifs</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
        ) : clients.map(c => (
          <Card key={c.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{c.nom}</CardTitle>
                    {c.code_client && <p className="text-xs text-muted-foreground">Code: {c.code_client}</p>}
                  </div>
                </div>
                <Badge className={cn("text-[10px] shrink-0", zoneColors[c.zone])}>{zoneLabels[c.zone]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {c.adresse_depot && <div className="flex gap-2 text-muted-foreground"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /><span>{c.adresse_depot}</span></div>}
              {c.contact_nom && <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{c.contact_nom}</span></div>}
              {c.contact_telephone && <div className="flex gap-2 text-muted-foreground"><Phone className="w-3 h-3 mt-0.5" /><span>{c.contact_telephone}</span></div>}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="flex items-center gap-1 text-muted-foreground"><Fuel className="w-3 h-3" />Conso. estimée</span>
                <span className="font-semibold text-secondary">{zoneConso[c.zone]}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 mr-1" /> Modifier</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => { if(confirm(`Supprimer ${c.nom} ?`)) deleteMutation.mutate(c.id); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && !isLoading && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun client enregistré</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2"><Label className="text-xs">Nom du client *</Label><Input className="mt-1" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
            <div><Label className="text-xs">Code client</Label><Input className="mt-1" value={form.code_client} onChange={e => setForm({ ...form, code_client: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Zone *</Label>
              <Select value={form.zone} onValueChange={v => setForm({ ...form, zone: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(zoneLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v} — {zoneConso[k]}/rotation</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">Adresse dépôt</Label><Input className="mt-1" value={form.adresse_depot} onChange={e => setForm({ ...form, adresse_depot: e.target.value })} /></div>
            <div><Label className="text-xs">Nom contact</Label><Input className="mt-1" value={form.contact_nom} onChange={e => setForm({ ...form, contact_nom: e.target.value })} /></div>
            <div><Label className="text-xs">Téléphone contact</Label><Input className="mt-1" value={form.contact_telephone} onChange={e => setForm({ ...form, contact_telephone: e.target.value })} /></div>
          </div>
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <Fuel className="w-3 h-3 inline mr-1" />
            Consommation estimée pour <strong>{zoneLabels[form.zone]}</strong> : <strong className="text-secondary">{zoneConso[form.zone]} par rotation</strong>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending || !form.nom}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}