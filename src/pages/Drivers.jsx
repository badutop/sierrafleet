import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadFile } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, User, Pencil, Trash2, Upload, ExternalLink, Loader2, X, Camera, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DocumentScanner from "@/components/drivers/DocumentScanner";
import DriverPhotoField from "@/components/drivers/DriverPhotoField";
import { confirm } from "@/lib/confirm";


const statusLabels = { actif: "Actif", inactif: "Inactif", en_mission: "En mission" };
const statusColors = { actif: "bg-emerald-500/10 text-emerald-600", inactif: "bg-muted text-muted-foreground", en_mission: "bg-blue-500/10 text-blue-600" };

const emptyForm = {
  prenom: "", nom: "", telephone: "", numero_permis: "", categorie_permis: "",
  date_expiration_permis: "", date_embauche: "", contact_urgence_nom: "",
  contact_urgence_telephone: "", statut: "actif",
  doc_permis_url: "", doc_cni_url: "", photo_url: "",
};

function DocUploadField({ label, value, fieldKey, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (value && !preview) setPreview(value);
    if (!value) setPreview(null);
  }, [value]);

  // Importation depuis fichier (galerie / PDF)
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    const { file_url } = await uploadFile(file, "driver-docs");
    onUploaded(fieldKey, file_url);
    if (previewUrl) setPreview(previewUrl);
    setUploading(false);
    toast.success(`${label} uploadé`);
  };

  // Après capture via le scanner avec gabarit
  const handleScanned = async (file, previewUrl) => {
    setUploading(true);
    setPreview(previewUrl);
    const { file_url } = await uploadFile(file, "driver-docs");
    onUploaded(fieldKey, file_url);
    setUploading(false);
    toast.success(`${label} uploadé`);
  };

  return (
    <div className="col-span-2">
      {scannerOpen && (
        <DocumentScanner onCapture={handleScanned} onClose={() => setScannerOpen(false)} />
      )}
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Button
          type="button" size="sm" variant="outline"
          className="flex-1 h-8 text-xs justify-start"
          onClick={() => setScannerOpen(true)}
          disabled={uploading}
        >
          <Camera className="w-3 h-3 mr-1.5" />
          {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Upload...</> : "Scanner avec caméra"}
        </Button>
        <Button
          type="button" size="sm" variant="outline"
          className="h-8 text-xs px-2"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-3 h-3" />
        </Button>
        {value && (
          <Button type="button" size="sm" variant="outline" className="h-8 px-2" asChild>
            <a href={value} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
      </div>

      {preview && (
        <div className="mt-2 relative inline-block">
          <img src={preview} alt="Aperçu document" className="max-h-36 rounded-lg border border-border object-contain bg-muted shadow-sm" style={{ aspectRatio: "1.585/1", width: "100%" }} />
          <button
            type="button"
            onClick={() => { setPreview(null); onUploaded(fieldKey, ""); }}
            className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {!preview && value && <p className="text-[10px] text-emerald-600 mt-0.5">✓ Document enregistré</p>}
    </div>
  );
}

export default function Drivers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: row, error } = await supabase.from("drivers").insert({ id: crypto.randomUUID(), ...data }).select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); closeDialog(); toast.success("Chauffeur ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("drivers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); closeDialog(); toast.success("Chauffeur modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Chauffeur supprimé"); },
  });

  const openCreate = () => { setEditingDriver(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d) => { setEditingDriver(d); setForm({ ...emptyForm, ...d }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingDriver(null); setForm(emptyForm); };

  const handleSave = () => {
    // Postgres rejette "" pour les colonnes date (l'ancien backend l'acceptait) — on convertit en null.
    const dateFields = ["date_expiration_permis", "date_embauche"];
    const data = { ...form };
    dateFields.forEach(f => { if (data[f] === "") data[f] = null; });
    if (editingDriver) updateMutation.mutate({ id: editingDriver.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = async (d) => {
    if (await confirm(`Supprimer le chauffeur ${d.prenom} ${d.nom} ?`)) deleteMutation.mutate(d.id);
  };

  const handleDocUploaded = (fieldKey, url) => {
    setForm(f => ({ ...f, [fieldKey]: url }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredDrivers = drivers.filter(d =>
    `${d.prenom} ${d.nom}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground">{drivers.length} chauffeurs</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un chauffeur..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Date d'embauche</TableHead>
                <TableHead>Expiration permis</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map(d => {
                const now = new Date();
                const permisExpiry = d.date_expiration_permis ? new Date(d.date_expiration_permis) : null;
                const daysLeft = permisExpiry ? Math.floor((permisExpiry - now) / 86400000) : null;

                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {d.photo_url ? (
                            <img src={d.photo_url} alt={`${d.prenom} ${d.nom}`} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="font-medium text-sm">{d.prenom} {d.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{d.date_embauche || "-"}</TableCell>
                    <TableCell className="text-xs">
                      <span className={cn(daysLeft !== null && daysLeft < 60 && "text-destructive font-medium")}>
                        {daysLeft !== null ? `${daysLeft} j` : "-"}
                      </span>
                    </TableCell>
                    <TableCell><Badge className={cn("text-[10px]", statusColors[d.statut])}>{statusLabels[d.statut]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(d)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(d)} disabled={deleteMutation.isPending}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDriver ? "Modifier le chauffeur" : "Nouveau chauffeur"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <DriverPhotoField value={form.photo_url} onUploaded={(url) => setForm(f => ({ ...f, photo_url: url }))} />
            {[["prenom","Prénom"],["nom","Nom"],["telephone","Téléphone"],["numero_permis","N° Permis"],["categorie_permis","Catégorie permis"]].map(([k, l]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input className="mt-1" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div>
              <Label className="text-xs">Expiration permis</Label>
              <Input type="date" className="mt-1" value={form.date_expiration_permis || ""} onChange={e => setForm({ ...form, date_expiration_permis: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Date d'embauche</Label>
              <Input type="date" className="mt-1" value={form.date_embauche || ""} onChange={e => setForm({ ...form, date_embauche: e.target.value })} />
            </div>

            {/* Documents obligatoires */}
            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Documents d'identité</p>
            </div>
            <div className="col-span-2 grid grid-cols-1 gap-3">
              <DocUploadField label="Scan Permis de conduire" value={form.doc_permis_url} fieldKey="doc_permis_url" onUploaded={handleDocUploaded} />
              <DocUploadField label="Scan CNI (Carte Nationale d'Identité)" value={form.doc_cni_url} fieldKey="doc_cni_url" onUploaded={handleDocUploaded} />
            </div>

            {/* Contact urgence */}
            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contact d'urgence</p>
            </div>
            <div>
              <Label className="text-xs">Nom du contact</Label>
              <Input className="mt-1" placeholder="Nom & prénom" value={form.contact_urgence_nom || ""} onChange={e => setForm({ ...form, contact_urgence_nom: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Téléphone urgence</Label>
              <Input className="mt-1" placeholder="+221..." value={form.contact_urgence_telephone || ""} onChange={e => setForm({ ...form, contact_urgence_telephone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Statut</Label>
              <Select value={form.statut || "actif"} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}