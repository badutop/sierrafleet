import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, AlertTriangle, Plus, X, ShoppingCart, IdCard, Package, CalendarClock, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";
import { displayThousands, parseThousandsInput } from "@/lib/numberFormat";

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
  duree_immobilisation_jours: "", prestataire: "",
  cout_pieces: "", cout_main_oeuvre: "", pieces_remplacees: "",
  km_entretien: "", prochaine_date: "", prochain_km: "", prochain_nb_rotations: "",
  statut: "planifie", gravite: "moyenne", observations: "",
};

export default function MaintenanceDialog({ open, onOpenChange, vehicles, driverMap = {}, entry, onSave, isPending, defaultCategorie }) {
  const [form, setForm] = useState(emptyForm);
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedParts, setSelectedParts] = useState([]);
  const [orderQty, setOrderQty] = useState({});
  const [orderedParts, setOrderedParts] = useState({});
  // Id généré dès l'ouverture (avant tout enregistrement en base) pour que
  // les commandes de pièces lancées pendant la saisie (rupture de stock,
  // voir orderMutation) puissent déjà pointer vers cette intervention via
  // garage_orders.maintenance_id — sinon ce lien serait irrémédiablement
  // perdu, l'intervention n'existant pas encore en base à ce moment-là.
  const [pendingId, setPendingId] = useState(null);

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
      const id = crypto.randomUUID();
      const payload = { id, statut: "en_attente", vehicle_id: form.vehicle_id || null, maintenance_id: pendingId, ...data };
      const { error } = await supabase.from("garage_orders").insert(payload);
      if (error) throw error;
      await logAudit("Commande Garage", id, "create", payload);
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
    setPendingId(entry ? entry.id : crypto.randomUUID());
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
  const coutMainOeuvre = Number(form.cout_main_oeuvre) || 0;
  const coutTotal = isReadOnly ? (Number(form.cout) || 0) : coutPieces + coutMainOeuvre;
  // En lecture seule, le détail pièces/MO vient des colonnes déjà enregistrées
  // (selectedParts reste vide pour une fiche existante, voir useEffect ci-dessus).
  const displayCoutPieces = isReadOnly ? (Number(form.cout_pieces) || 0) : coutPieces;
  const isCorrective = form.categorie === "corrective";
  // La prochaine échéance planifiée n'a de sens qu'après la date de
  // l'intervention en cours — sinon on planifierait un entretien "avant" lui.
  const prochaineDateInvalid = !!(form.prochaine_date && form.date_entretien && form.prochaine_date <= form.date_entretien);
  // Aucun de ces compteurs/durées ne peut être négatif.
  const dureeInvalid = !!(form.duree_immobilisation_jours !== "" && Number(form.duree_immobilisation_jours) < 0);
  const kmEntretienInvalid = !!(form.km_entretien !== "" && Number(form.km_entretien) < 0);
  const prochainKmInvalid = !!(form.prochain_km !== "" && Number(form.prochain_km) < 0);
  const prochainRotationsInvalid = !!(form.prochain_nb_rotations !== "" && Number(form.prochain_nb_rotations) < 0);
  const isValid = form.vehicle_id && form.vehicle_id !== "" && form.date_entretien && form.type_entretien
    && !prochaineDateInvalid && !dureeInvalid && !kmEntretienInvalid && !prochainKmInvalid && !prochainRotationsInvalid;
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
    const numericFields = ["km_entretien","prochain_km","prochain_nb_rotations","duree_immobilisation_jours","cout_main_oeuvre"];
    const dateFields = ["prochaine_date"];
    const payload = { ...form, id: pendingId, isNew: !entry, cout: coutTotal, cout_pieces: coutPieces };
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <Wrench className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            {entry ? "Détail de l'intervention" : "Nouvelle intervention"}
          </DialogTitle>
        </div>

        <div className="space-y-3 mt-2">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-primary flex items-center gap-1.5"><IdCard className="w-4 h-4" />Intervention</p>
          {/* Véhicule */}
          <div>
            <Label className="text-xs">Véhicule <span className="text-green-600 font-bold">*</span></Label>
            <Select value={form.vehicle_id || ""} onValueChange={v => set("vehicle_id", v)}>
              <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="— Sélectionner un véhicule —" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.immatriculation}{driverMap[v.driver_id] && ` — ${driverMap[v.driver_id].prenom} ${driverMap[v.driver_id].nom}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.vehicle_id && <p className="text-[11px] text-destructive mt-1">Véhicule requis pour enregistrer</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Catégorie */}
            <div>
              <Label className="text-xs">Catégorie <span className="text-green-600 font-bold">*</span></Label>
              <Select value={form.categorie} onValueChange={v => set("categorie", v)}>
                <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categorieLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <Label className="text-xs">Type d'intervention <span className="text-green-600 font-bold">*</span></Label>
              <Select value={form.type_entretien} onValueChange={v => set("type_entretien", v)}>
                <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><Package className="w-4 h-4" />Pièces & coût</p>
          {/* Pièces */}
          <div>
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

          {/* Prestataire externe & main d'œuvre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prestataire externe</Label>
              {!isReadOnly ? (
                <Input className="mt-1 bg-card" placeholder="Ex: Garage Ndiaye, Atelier interne..." value={form.prestataire} onChange={e => set("prestataire", e.target.value)} />
              ) : (
                <p className="mt-1 h-9 flex items-center text-sm text-foreground">{form.prestataire || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Coût main d'œuvre (FCFA)</Label>
              {!isReadOnly ? (
                <Input
                  type="text" inputMode="numeric" className="mt-1 bg-card" placeholder="0"
                  value={displayThousands(form.cout_main_oeuvre)}
                  onChange={e => set("cout_main_oeuvre", parseThousandsInput(e.target.value) ?? "")}
                />
              ) : (
                <p className="mt-1 h-9 flex items-center text-sm text-foreground">{(Number(form.cout_main_oeuvre) || 0).toLocaleString("fr-FR")} FCFA</p>
              )}
            </div>
          </div>

          {/* Coût — pièces au prix catalogue (jamais saisi) + main d'œuvre éventuelle */}
          <div className="bg-card rounded-lg px-3 py-2 space-y-1 text-xs border border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Coût pièces (prix catalogue)</span>
              <span className="font-medium">{displayCoutPieces.toLocaleString("fr-FR")} FCFA</span>
            </div>
            {coutMainOeuvre > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coût main d'œuvre</span>
                <span className="font-medium">{coutMainOeuvre.toLocaleString("fr-FR")} FCFA</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-border pt-1">
              <span className="text-muted-foreground font-semibold">Total</span>
              <span className="font-bold text-secondary text-sm">{coutTotal.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>

          {/* Désignation — générée automatiquement */}
          <div className="bg-card rounded-lg px-3 py-2 text-xs border border-border">
            <span className="text-muted-foreground">Désignation / Titre (générée)</span>
            <p className="font-semibold text-foreground text-sm mt-0.5">{form.designation || "—"}</p>
          </div>
        </div>

        {isCorrective && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Détails de la panne</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Gravité</Label>
                <Select value={form.gravite} onValueChange={v => set("gravite", v)}>
                  <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(graviteLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}><span className={graviteColors[k]}>{v}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Immobilisation (jours)</Label>
                <Input type="number" min="0" className="mt-1 bg-card" placeholder="0" value={form.duree_immobilisation_jours} onChange={e => set("duree_immobilisation_jours", e.target.value)} />
                {dureeInvalid && <p className="text-[11px] text-destructive mt-1">Ne peut pas être négative</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs">Description du problème</Label>
              <Textarea className="mt-1 text-sm bg-card" rows={2} placeholder="Décrivez la panne ou le dysfonctionnement observé..." value={form.description_panne} onChange={e => set("description_panne", e.target.value)} />
            </div>
          </div>
        )}

        <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><CalendarClock className="w-4 h-4" />Planification & suivi</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date intervention <span className="text-green-600 font-bold">*</span></Label>
              <Input type="date" className="mt-1 bg-card" value={form.date_entretien} onChange={e => set("date_entretien", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Km au compteur</Label>
              <Input type="number" min="0" className="mt-1 bg-card" value={form.km_entretien} onChange={e => set("km_entretien", e.target.value)} />
              {kmEntretienInvalid && <p className="text-[11px] text-destructive mt-1">Ne peut pas être négatif</p>}
            </div>
            <div>
              <Label className="text-xs">Prochaine date prévue</Label>
              <Input type="date" className="mt-1 bg-card" value={form.prochaine_date} onChange={e => set("prochaine_date", e.target.value)} />
              {prochaineDateInvalid && <p className="text-[11px] text-destructive mt-1">Doit être postérieure à la date d'intervention</p>}
            </div>
            <div>
              <Label className="text-xs">Prochain Km</Label>
              <Input type="number" min="0" className="mt-1 bg-card" value={form.prochain_km} onChange={e => set("prochain_km", e.target.value)} />
              {prochainKmInvalid && <p className="text-[11px] text-destructive mt-1">Ne peut pas être négatif</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Déclencher après N rotations</Label>
              <Input type="number" min="0" className="mt-1 bg-card" placeholder="Ex: 50" value={form.prochain_nb_rotations} onChange={e => set("prochain_nb_rotations", e.target.value)} />
              {prochainRotationsInvalid && <p className="text-[11px] text-destructive mt-1">Ne peut pas être négatif</p>}
            </div>
          </div>
        </div>

        {/* Observations */}
        <div>
          <Label className="text-xs">Observations</Label>
          <Textarea className="mt-1 text-sm" rows={2} placeholder="Notes complémentaires..." value={form.observations} onChange={e => set("observations", e.target.value)} />
        </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {entry ? "Fermer" : "Annuler"}
          </Button>
          {!entry && (
            <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave} disabled={!isValid || isPending}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}