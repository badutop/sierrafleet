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
import { Plus, Building2, Search, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DepotsEditor from "@/components/clients/DepotsEditor";
import { confirm } from "@/lib/confirm";

const zoneLabels = { zone1: "Zone 1", zone2: "Zone 2", zone3: "Zone 3", zone4: "Zone 4" };
const zoneColors = { zone1: "bg-green-500/10 text-green-600", zone2: "bg-blue-500/10 text-blue-600", zone3: "bg-amber-500/10 text-amber-600", zone4: "bg-red-500/10 text-red-600" };
const zoneConso = { zone1: "8–10 L", zone2: "25 L", zone3: "30 L", zone4: "40 L" };

const emptyForm = { nom: "", code_client: "", zone: "zone1", contact_nom: "", contact_telephone: "", actif: true };

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [depots, setDepots] = useState([]);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: allDepots = [] } = useQuery({ queryKey: ["depots"], queryFn: () => base44.entities.Depot.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: async (client) => {
      await Promise.all(depots.map(d => base44.entities.Depot.create({
        ...d,
        client_id: client.id,
        latitude: d.latitude !== "" ? parseFloat(d.latitude) : undefined,
        longitude: d.longitude !== "" ? parseFloat(d.longitude) : undefined,
      })));
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      closeDialog();
      toast.success("Client ajouté");
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: async (_, { id }) => {
      const existing = allDepots.filter(d => d.client_id === id);
      await Promise.all(existing.map(d => base44.entities.Depot.delete(d.id)));
      await Promise.all(depots.map(d => base44.entities.Depot.create({
        ...d,
        client_id: id,
        latitude: d.latitude !== "" ? parseFloat(d.latitude) : undefined,
        longitude: d.longitude !== "" ? parseFloat(d.longitude) : undefined,
      })));
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      closeDialog();
      toast.success("Client modifié");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const existing = allDepots.filter(d => d.client_id === id);
      await Promise.all(existing.map(d => base44.entities.Depot.delete(d.id)));
      return base44.entities.Client.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      toast.success("Client supprimé");
    },
  });

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDepots([]);
    setDialogOpen(true);
  };
  const openEdit = (c) => {
    setEditingClient(c);
    setForm({ ...emptyForm, ...c });
    setDepots(allDepots.filter(d => d.client_id === c.id).map(d => ({ ...d })));
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingClient(null); setForm(emptyForm); setDepots([]); };

  const handleSave = () => {
    const data = { ...form };
    if (editingClient) updateMutation.mutate({ id: editingClient.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = async (c) => {
    if (await confirm(`Supprimer ${c.nom} ?`)) deleteMutation.mutate(c.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredClients = clients.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.code_client?.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Dépôts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(c => {
                  const clientDepots = allDepots.filter(d => d.client_id === c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.nom}</p>
                            {c.code_client && <p className="text-[11px] text-muted-foreground">Code: {c.code_client}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.contact_nom || "-"}
                        {c.contact_telephone && <p className="text-muted-foreground">{c.contact_telephone}</p>}
                      </TableCell>
                      <TableCell><Badge className={cn("text-[10px]", zoneColors[c.zone])}>{zoneLabels[c.zone]}</Badge></TableCell>
                      <TableCell className="text-xs">{clientDepots.length || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredClients.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun client trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs">Nom du client *</Label><Input className="mt-1" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label className="text-xs">Code client</Label><Input className="mt-1" value={form.code_client || ""} onChange={e => setForm({ ...form, code_client: e.target.value })} /></div>
              <div><Label className="text-xs">Zone principale</Label>
                <Select value={form.zone || "zone1"} onValueChange={v => setForm({ ...form, zone: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(zoneLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v} — {zoneConso[k]}/rotation</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Nom contact</Label><Input className="mt-1" value={form.contact_nom || ""} onChange={e => setForm({ ...form, contact_nom: e.target.value })} /></div>
              <div><Label className="text-xs">Téléphone contact</Label><Input className="mt-1" value={form.contact_telephone || ""} onChange={e => setForm({ ...form, contact_telephone: e.target.value })} /></div>
              <div><Label className="text-xs">Tarif / tonne (FCFA)</Label><Input type="number" className="mt-1" value={form.tarif_par_tonne || ""} onChange={e => setForm({ ...form, tarif_par_tonne: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>

            <div className="border-t border-border pt-3">
              <DepotsEditor depots={depots} onChange={setDepots} />
            </div>
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