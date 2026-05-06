import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, AlertTriangle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const typeLabels = {
  vidange: "Vidange", revision: "Révision générale", pneus: "Pneus", filtres: "Filtres",
  freins: "Freins", controle_technique: "Contrôle technique", assurance: "Assurance",
  panne_moteur: "Panne moteur", panne_electricite: "Panne électricité",
  panne_transmission: "Panne transmission", carrosserie: "Carrosserie", autre: "Autre",
};

const graviteLabels = { faible: "Faible", moyenne: "Moyenne", elevee: "Élevée", critique: "Critique" };
const graviteColors = { faible: "text-emerald-600", moyenne: "text-amber-600", elevee: "text-orange-600", critique: "text-destructive" };

const emptyForm = {
  vehicle_id: "", categorie: "preventive", type_entretien: "vidange", designation: "",
  description_panne: "", date_entretien: new Date().toISOString().split("T")[0],
  date_fin_intervention: "", duree_immobilisation_jours: "", prestataire: "",
  cout: "", cout_pieces: "", cout_main_oeuvre: "", pieces_remplacees: "",
  km_entretien: "", prochaine_date: "", prochain_km: "", prochain_nb_rotations: "",
  statut: "planifie", gravite: "moyenne", observations: "",
};

export default function MaintenanceDialog({ open, onOpenChange, vehicles, entry, onSave, isPending }) {
  const [form, setForm] = useState(emptyForm);
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedParts, setSelectedParts] = useState([]);

  const { data: spareParts = [] } = useQuery({
    queryKey: ["spare-parts"],
    queryFn: () => base44.entities.SparePart.list("designation"),
  });

  const addPart = (partId) => {
    if (!partId) return;
    const part = spareParts.find(p => p.id === partId);
    if (!part || selectedParts.find(p => p.id === partId)) return;
    const newParts = [...selectedParts, part];
    setSelectedParts(newParts);
    setSelectedPart("");
    // Mettre à jour le champ texte pieces_remplacees
    const names = newParts.map(p => p.designation).join(", ");
    if (!isReadOnly) setForm(f => ({ ...f, pieces_remplacees: names }));
  };

  const removePart = (partId) => {
    const newParts = selectedParts.filter(p => p.id !== partId);
    setSelectedParts(newParts);
    const names = newParts.map(p => p.designation).join(", ");
    if (!isReadOnly) setForm(f => ({ ...f, pieces_remplacees: names }));
  };
  const isReadOnly = !!entry; // une fiche existante ne peut plus être modifiée

  useEffect(() => {
    if (entry) setForm({ ...emptyForm, ...entry });
    else setForm(emptyForm);
    setSelectedParts([]);
    setSelectedPart("");
  }, [entry, open]);

  const set = (k, v) => { if (!isReadOnly) setForm(f => ({ ...f, [k]: v })); };

  const coutTotal = (Number(form.cout_pieces) || 0) + (Number(form.cout_main_oeuvre) || 0) || Number(form.cout) || 0;
  const isCorrective = form.categorie === "corrective";
  const isValid = form.vehicle_id && form.vehicle_id !== "" && form.date_entretien && form.type_entretien;

  const handleSave = () => {
    const numericFields = ["cout","cout_pieces","cout_main_oeuvre","km_entretien","prochain_km","prochain_nb_rotations","duree_immobilisation_jours"];
    const payload = { ...form, cout: coutTotal || Number(form.cout) || 0 };
    numericFields.forEach(k => {
      const v = payload[k];
      if (v === "" || v === null || v === undefined) delete payload[k];
      else payload[k] = Number(v) || 0;
    });
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-secondary" />
            {entry ? "Détail de l'intervention" : "Nouvelle intervention"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Véhicule */}
          <div className="col-span-2">
            <Label className="text-xs">Véhicule *</Label>
            <Select value={form.vehicle_id || ""} onValueChange={v => set("vehicle_id", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="— Sélectionner un véhicule —" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.code_camion ? `[${v.code_camion}] ` : ""}{v.immatriculation}{v.marque ? ` — ${v.marque} ${v.modele}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.vehicle_id && <p className="text-[11px] text-destructive mt-1">Véhicule requis pour enregistrer</p>}
          </div>

          {/* Catégorie */}
          <div>
            <Label className="text-xs">Catégorie *</Label>
            <Select value={form.categorie} onValueChange={v => set("categorie", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preventive">🔧 Préventive (planifiée)</SelectItem>
                <SelectItem value="corrective">🚨 Corrective (panne/réparation)</SelectItem>
              </SelectContent>
            </Select>
          </div>



          {/* Type */}
          <div>
            <Label className="text-xs">Type d'intervention *</Label>
            <Select value={form.type_entretien} onValueChange={v => set("type_entretien", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Gravité (corrective only) */}
          {isCorrective && (
            <div>
              <Label className="text-xs">Gravité</Label>
              <Select value={form.gravite} onValueChange={v => set("gravite", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(graviteLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}><span className={graviteColors[k]}>{v}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Désignation */}
          <div className="col-span-2">
            <Label className="text-xs">Désignation / Titre</Label>
            <Input className="mt-1" placeholder="Ex: Vidange moteur 10W40, Remplacement plaquettes..." value={form.designation} onChange={e => set("designation", e.target.value)} />
          </div>

          {/* Description panne (corrective) */}
          {isCorrective && (
            <div className="col-span-2">
              <Label className="text-xs">Description du problème</Label>
              <Textarea className="mt-1 text-sm" rows={2} placeholder="Décrivez la panne ou le dysfonctionnement observé..." value={form.description_panne} onChange={e => set("description_panne", e.target.value)} />
            </div>
          )}

          {/* Dates */}
          <div>
            <Label className="text-xs">Date intervention *</Label>
            <Input type="date" className="mt-1" value={form.date_entretien} onChange={e => set("date_entretien", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Date fin {isCorrective ? "*" : ""}</Label>
            <Input type="date" className="mt-1" value={form.date_fin_intervention} onChange={e => set("date_fin_intervention", e.target.value)} />
          </div>

          {/* Immobilisation */}
          {isCorrective && (
            <div>
              <Label className="text-xs">Immobilisation (jours)</Label>
              <Input type="number" min="0" className="mt-1" placeholder="0" value={form.duree_immobilisation_jours} onChange={e => set("duree_immobilisation_jours", e.target.value)} />
            </div>
          )}

          {/* Prestataire */}
          <div>
            <Label className="text-xs">Prestataire / Garage</Label>
            <Input className="mt-1" placeholder="Nom du garage..." value={form.prestataire} onChange={e => set("prestataire", e.target.value)} />
          </div>

          {/* Coûts */}
          <div>
            <Label className="text-xs">Coût pièces (FCFA)</Label>
            <Input type="number" min="0" className="mt-1" placeholder="0" value={form.cout_pieces} onChange={e => set("cout_pieces", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Coût main d'œuvre (FCFA)</Label>
            <Input type="number" min="0" className="mt-1" placeholder="0" value={form.cout_main_oeuvre} onChange={e => set("cout_main_oeuvre", e.target.value)} />
          </div>

          {/* Coût total calculé */}
          <div className="col-span-2 bg-muted/50 rounded-lg px-3 py-2 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Coût total calculé</span>
            <span className="font-bold text-secondary text-sm">{coutTotal.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Pièces */}
          <div className="col-span-2">
            <Label className="text-xs">Pièces remplacées</Label>
            {!isReadOnly && (
              <div className="flex gap-2 mt-1">
                <Select value={selectedPart} onValueChange={addPart}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="— Sélectionner une pièce du stock —" />
                  </SelectTrigger>
                  <SelectContent>
                    {spareParts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-[10px] text-muted-foreground mr-2">{p.reference}</span>
                        {p.designation}
                        <span className="ml-2 text-[10px] text-muted-foreground">({p.quantite_stock} en stock)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedParts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedParts.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md">
                    <span className="font-mono text-[10px] text-muted-foreground">{p.reference}</span>
                    {p.designation}
                    {!isReadOnly && (
                      <button onClick={() => removePart(p.id)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            <Input className="mt-2" placeholder="Ou saisir manuellement: Filtre huile, Plaquettes avant..." value={form.pieces_remplacees} onChange={e => set("pieces_remplacees", e.target.value)} />
          </div>

          {/* Km */}
          <div>
            <Label className="text-xs">Km au compteur</Label>
            <Input type="number" min="0" className="mt-1" value={form.km_entretien} onChange={e => set("km_entretien", e.target.value)} />
          </div>

          {/* Prochaine maintenance */}
          <div>
            <Label className="text-xs">Prochaine date prévue</Label>
            <Input type="date" className="mt-1" value={form.prochaine_date} onChange={e => set("prochaine_date", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Prochain Km</Label>
            <Input type="number" min="0" className="mt-1" value={form.prochain_km} onChange={e => set("prochain_km", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Déclencher après N rotations</Label>
            <Input type="number" min="0" className="mt-1" placeholder="Ex: 50" value={form.prochain_nb_rotations} onChange={e => set("prochain_nb_rotations", e.target.value)} />
          </div>

          {/* Observations */}
          <div className="col-span-2">
            <Label className="text-xs">Observations</Label>
            <Textarea className="mt-1 text-sm" rows={2} placeholder="Notes complémentaires..." value={form.observations} onChange={e => set("observations", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{entry ? "Fermer" : "Annuler"}</Button>
          {!entry && (
            <Button className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave} disabled={!isValid || isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}