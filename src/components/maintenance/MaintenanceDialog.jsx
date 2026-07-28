import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, AlertTriangle, Plus, X, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const typeLabels = {
  vidange: "Vidange", revision: "Révision générale", pneus: "Pneus", filtres: "Filtres",
  freins: "Freins", controle_technique: "Contrôle technique", assurance: "Assurance",
  panne_moteur: "Panne moteur", panne_electricite: "Panne électricité",
  panne_transmission: "Panne transmission", carrosserie: "Carrosserie", autre: "Autre",
};

const graviteLabels = { faible: "Faible", moyenne: "Moyenne", elevee: "Élevée", critique: "Critique" };
const graviteColors = { faible: "text-emerald-600", moyenne: "text-amber-600", elevee: "text-orange-600", critique: "text-destructive" };

const categorieLabels = { preventive: "🔧 Préventif", corrective: "🚨 Correctif" };

// Filtre les pièces proposées selon le type d'intervention choisi ; les types
// sans correspondance nette (révision, contrôle technique, assurance...)
// laissent la liste complète des pièces disponibles.
const TYPE_TO_PART_CATEGORIES = {
  vidange: ["moteur", "filtres"],
  pneus: ["pneumatiques"],
  filtres: ["filtres"],
  freins: ["freinage"],
  panne_moteur: ["moteur"],
  panne_electricite: ["electricite"],
  panne_transmission: ["transmission"],
  carrosserie: ["carrosserie"],
  autre: ["autre"],
};

const emptyForm = {
  vehicle_id: "", categorie: "preventive", type_entretien: "vidange", designation: "",
  description_panne: "", date_entretien: new Date().toISOString().split("T")[0],
  duree_immobilisation_jours: "",
  cout_pieces: "", pieces_remplacees: "",
  km_entretien: "", prochaine_date: "", prochain_km: "", prochain_nb_rotations: "",
  statut: "planifie", gravite: "moyenne", observations: "",
};

export default function MaintenanceDialog({ open, onOpenChange, vehicles, entry, onSave, isPending, defaultCategorie }) {
  const [form, setForm] = useState(emptyForm);
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedParts, setSelectedParts] = useState([]);
  const [orderQty, setOrderQty] = useState({});
  const [orderedParts, setOrderedParts] = useState({});

  const { data: spareParts = [] } = useQuery({
    queryKey: ["spare-parts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("spare_parts").select("*").order("designation");
      if (error) throw error;
      return data;
    },
  });

  // Déclenche une alerte dans Commandes Garage quand une pièce nécessaire
  // n'est plus en stock — le responsable la valide/lance depuis ce module.
  const orderMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("garage_orders").insert({
        id: crypto.randomUUID(), statut: "en_attente", vehicle_id: form.vehicle_id || null, ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Commande envoyée vers Commandes Garage > Alertes"),
  });

  const handleOrder = (part) => {
    const qty = Number(orderQty[part.id]) || 1;
    orderMutation.mutate(
      { spare_part_id: part.id, designation: part.designation, categorie: part.categorie, quantite: qty },
      { onSuccess: () => setOrderedParts(o => ({ ...o, [part.id]: true })) }
    );
  };

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
    else setForm({ ...emptyForm, categorie: defaultCategorie || emptyForm.categorie });
    setSelectedParts([]);
    setSelectedPart("");
    setOrderQty({});
    setOrderedParts({});
  }, [entry, open, defaultCategorie]);

  const set = (k, v) => { if (!isReadOnly) setForm(f => ({ ...f, [k]: v })); };

  // Le coût des pièces provient de leur prix catalogue (fixé à la création de
  // la pièce / commande) : il est seulement affiché, jamais saisi ici. Les
  // fiches existantes (avant la fusion Maintenance/Réparations) peuvent encore
  // porter un coût main d'œuvre historique dans m.cout.
  const coutPieces = selectedParts.reduce((s, p) => s + (Number(p.prix_unitaire) || 0), 0);
  const coutTotal = isReadOnly ? (Number(form.cout) || 0) : coutPieces;
  const isCorrective = form.categorie === "corrective";
  const isValid = form.vehicle_id && form.vehicle_id !== "" && form.date_entretien && form.type_entretien;
  const allowedPartCategories = TYPE_TO_PART_CATEGORIES[form.type_entretien];
  const filteredSpareParts = allowedPartCategories ? spareParts.filter(p => allowedPartCategories.includes(p.categorie)) : spareParts;

  // Désignation générée à partir de la catégorie, du type d'intervention et
  // des pièces sélectionnées — plus de saisie libre.
  useEffect(() => {
    if (isReadOnly) return;
    const catLabel = form.categorie === "corrective" ? "Réparation" : "Entretien préventif";
    const typeLabel = typeLabels[form.type_entretien] || form.type_entretien;
    const partsNames = selectedParts.length > 0 ? selectedParts.map(p => p.designation).join(", ") : (form.pieces_remplacees || "");
    const designation = partsNames ? `${catLabel} — ${typeLabel} (${partsNames})` : `${catLabel} — ${typeLabel}`;
    setForm(f => (f.designation === designation ? f : { ...f, designation }));
  }, [form.categorie, form.type_entretien, form.pieces_remplacees, selectedParts, isReadOnly]);

  const handleSave = () => {
    const numericFields = ["km_entretien","prochain_km","prochain_nb_rotations","duree_immobilisation_jours"];
    const dateFields = ["prochaine_date"];
    const payload = { ...form, cout: coutTotal, cout_pieces: coutPieces };
    numericFields.forEach(k => {
      const v = payload[k];
      if (v === "" || v === null || v === undefined) delete payload[k];
      else payload[k] = Number(v) || 0;
    });
    dateFields.forEach(k => {
      if (payload[k] === "") delete payload[k];
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
                {Object.entries(categorieLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                    {filteredSpareParts.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucune pièce dans cette catégorie</div>
                    )}
                    {filteredSpareParts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-[10px] text-muted-foreground mr-2">{p.reference}</span>
                        {p.designation}
                        <span className={cn("ml-2 text-[10px]", Number(p.quantite_stock) === 0 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                          ({p.quantite_stock} en stock)
                        </span>
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
            {!isReadOnly && (
              <Input className="mt-2" placeholder="Ou saisir manuellement: Filtre huile, Plaquettes avant..." value={form.pieces_remplacees} onChange={e => set("pieces_remplacees", e.target.value)} />
            )}
            {/* Rupture de stock — déclenche une alerte dans Commandes Garage */}
            {!isReadOnly && selectedParts.filter(p => Number(p.quantite_stock) === 0).map(p => (
              <div key={`order-${p.id}`} className="flex items-center gap-2 mt-2 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="flex-1">{p.designation} — rupture de stock</span>
                {orderedParts[p.id] ? (
                  <span className="text-emerald-700 font-medium">✔ Commande envoyée</span>
                ) : (
                  <>
                    <Input
                      type="number" min="1" className="h-7 w-16 text-xs"
                      value={orderQty[p.id] ?? 1}
                      onChange={e => setOrderQty(q => ({ ...q, [p.id]: e.target.value }))}
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleOrder(p)} disabled={orderMutation.isPending}>
                      <ShoppingCart className="w-3 h-3" /> Commander
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Coût — provient du prix catalogue des pièces, jamais saisi ici */}
          <div className="col-span-2 bg-muted/50 rounded-lg px-3 py-2 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Coût pièces (prix catalogue)</span>
            <span className="font-bold text-secondary text-sm">{coutTotal.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Désignation — générée automatiquement */}
          <div className="col-span-2 bg-muted/50 rounded-lg px-3 py-2 text-xs">
            <span className="text-muted-foreground">Désignation / Titre (générée)</span>
            <p className="font-semibold text-foreground text-sm mt-0.5">{form.designation || "—"}</p>
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
          {/* Immobilisation */}
          {isCorrective && (
            <div>
              <Label className="text-xs">Immobilisation (jours)</Label>
              <Input type="number" min="0" className="mt-1" placeholder="0" value={form.duree_immobilisation_jours} onChange={e => set("duree_immobilisation_jours", e.target.value)} />
            </div>
          )}

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