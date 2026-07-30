import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, CheckCircle2, Package, XCircle, ChevronRight, Receipt, Banknote, Upload, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const STEPS = [
  { key: "en_attente",     label: "En attente",     icon: FileText },
  { key: "commandee",      label: "Commandée",      icon: Send },
  { key: "confirmee",      label: "Confirmée",      icon: CheckCircle2 },
  { key: "recue",          label: "Reçue",          icon: Package },
  { key: "facture_recue",  label: "Facture reçue",  icon: Receipt },
  { key: "payee",          label: "Payée",          icon: Banknote },
];

const STATUT_BADGE = {
  en_attente: "bg-blue-500/15 text-blue-700 border-blue-400/30",
  commandee: "bg-amber-500/15 text-amber-700 border-amber-400/30",
  confirmee: "bg-purple-500/15 text-purple-700 border-purple-400/30",
  recue: "bg-teal-500/15 text-teal-700 border-teal-400/30",
  facture_recue: "bg-orange-500/15 text-orange-700 border-orange-400/30",
  payee: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
  annulee: "bg-muted text-muted-foreground",
};

const STATUT_LABEL = {
  en_attente: "En attente", commandee: "Commandée", confirmee: "Confirmée",
  recue: "Reçue", facture_recue: "Facture reçue", payee: "Payée", annulee: "Annulée",
};

const emptyLaunchForm = {
  designation: "", quantite: 1, supplier_id: "", date_livraison_prevue: "",
  conditions_paiement: "", delai_paiement_jours: 30, prix_unitaire: "", notes: "",
};

export default function GarageOrderDialog({ open, onOpenChange, order, vMap, suppliers, onLaunch, onSaveDraft, onConfirm, onReceive, onInvoiceReceived, onPaid, onCancel, isPending }) {
  const { user: currentUser } = useAuth();
  // La réception de facture et le paiement relèvent de Finances (Resp.
  // Exploitation suit la commande jusqu'à la réception de la pièce, pas
  // au-delà — voir CampaignDetail.jsx pour ses autres restrictions).
  const canHandleInvoice = currentUser?.role === "admin" || currentUser?.role === "finances";
  const [form, setForm] = useState(emptyLaunchForm);
  const [invoiceForm, setInvoiceForm] = useState({ date_facture: "", montant_facture: "", facture_url: "" });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const invoiceFileRef = useRef();

  useEffect(() => {
    if (order) {
      setForm({ ...emptyLaunchForm, ...order });
      setInvoiceForm({
        date_facture: order.date_facture || new Date().toISOString().split("T")[0],
        montant_facture: order.montant_facture ?? order.montant_total ?? "",
        facture_url: order.facture_url || "",
      });
    }
  }, [order, open]);

  if (!order) return null;

  const stepIndex = STEPS.findIndex(s => s.key === order.statut);
  const isCancelled = order.statut === "annulee";
  const vehicle = vMap?.[order.vehicle_id];
  const supplierMap = Object.fromEntries((suppliers || []).map(s => [s.id, s]));

  const buildOrderPayload = () => ({
    designation: form.designation,
    quantite: Number(form.quantite) || 1,
    supplier_id: form.supplier_id || null,
    date_livraison_prevue: form.date_livraison_prevue || null,
    conditions_paiement: form.conditions_paiement || null,
    delai_paiement_jours: Number(form.delai_paiement_jours) || 30,
    prix_unitaire: Number(form.prix_unitaire) || 0,
    montant_total: (Number(form.prix_unitaire) || 0) * (Number(form.quantite) || 1),
    notes: form.notes || null,
  });

  const handleLaunch = () => onLaunch(order.id, buildOrderPayload());
  const handleSaveDraft = () => onSaveDraft(order.id, buildOrderPayload());

  const handleInvoiceFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingInvoice(true);
    try {
      const { file_url } = await uploadFile(file, "garage-invoices");
      setInvoiceForm(f => ({ ...f, facture_url: file_url }));
      toast.success("Facture scannée");
    } catch (err) {
      toast.error(`Erreur lors de l'envoi du scan : ${err.message}`);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleConfirmInvoice = () => {
    const delai = Number(order.delai_paiement_jours) || 30;
    const echeance = new Date(invoiceForm.date_facture);
    echeance.setDate(echeance.getDate() + delai);
    onInvoiceReceived(order.id, {
      date_facture: invoiceForm.date_facture,
      montant_facture: Number(invoiceForm.montant_facture) || 0,
      facture_url: invoiceForm.facture_url || null,
      date_echeance: echeance.toISOString().split("T")[0],
    });
  };

  const echeanceDays = order.date_echeance ? Math.ceil((new Date(order.date_echeance) - new Date()) / 86400000) : null;
  const echeanceClass = echeanceDays === null ? "border-border bg-muted/50"
    : echeanceDays < 0 ? "border-destructive/30 bg-destructive/10 text-destructive"
    : echeanceDays <= 7 ? "border-amber-400/30 bg-amber-500/10 text-amber-700"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-700";
  const echeanceDaysLabel = echeanceDays === null ? "" : echeanceDays < 0 ? `(en retard de ${Math.abs(echeanceDays)}j)` : `(${echeanceDays}j restants)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-secondary shrink-0" />
            <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">Commande pièce garage</DialogTitle>
          </div>
        </div>
        <div className="flex justify-end -mt-1">
          <Badge className={cn("text-[10px]", STATUT_BADGE[order.statut])}>{STATUT_LABEL[order.statut]}</Badge>
        </div>

        {/* Stepper */}
        {!isCancelled && (
          <div className="flex items-center mt-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i <= stepIndex;
              return (
                <React.Fragment key={s.key}>
                  {i > 0 && <div className={cn("flex-1 h-0.5", i <= stepIndex ? "bg-primary" : "bg-muted")} />}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2",
                      active ? "bg-primary border-primary text-primary-foreground" : "border-muted text-muted-foreground")}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={cn("text-[9px] font-medium text-center leading-tight", active ? "text-primary" : "text-muted-foreground")}>{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        {isCancelled && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/50 border border-border rounded-lg py-2 text-xs mt-2">
            <XCircle className="w-4 h-4" /> Commande annulée
          </div>
        )}

        {/* Pièce / Véhicule — éditables tant que la commande n'est pas envoyée */}
        {order.statut === "en_attente" ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="col-span-2">
              <Label className="text-xs">Désignation</Label>
              <Input className="mt-1" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Quantité</Label>
              <Input type="number" min="1" className="mt-1" value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Véhicule</Label>
              <div className="mt-1 h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                {vehicle ? `${vehicle.code_camion ? `[${vehicle.code_camion}] ` : ""}${vehicle.immatriculation}` : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Pièce</span>
              <p className="font-semibold text-sm mt-0.5">{order.designation}</p>
            </div>
            <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Quantité</span>
              <p className="font-semibold text-sm mt-0.5">{order.quantite}</p>
            </div>
            <div className="col-span-2 bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Véhicule</span>
              <p className="font-semibold text-sm mt-0.5">
                {vehicle ? `${vehicle.code_camion ? `[${vehicle.code_camion}] ` : ""}${vehicle.immatriculation}` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Formulaire de lancement (statut en_attente uniquement) */}
        {order.statut === "en_attente" && (
          <div className="grid grid-cols-2 gap-3 mt-3 border-t border-border pt-3">
            <div className="col-span-2">
              <Label className="text-xs">Fournisseur *</Label>
              <Select value={form.supplier_id || ""} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="— Sélectionner un fournisseur —" /></SelectTrigger>
                <SelectContent>
                  {(suppliers || []).map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date de livraison prévue</Label>
              <Input type="date" className="mt-1" value={form.date_livraison_prevue || ""} onChange={e => setForm(f => ({ ...f, date_livraison_prevue: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Prix unitaire (FCFA)</Label>
              <Input type="number" min="0" className="mt-1" placeholder="0" value={form.prix_unitaire || ""} onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Conditions de paiement</Label>
              <Input className="mt-1" placeholder="Ex: Virement, chèque..." value={form.conditions_paiement || ""} onChange={e => setForm(f => ({ ...f, conditions_paiement: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Délai de paiement (jours)</Label>
              <Input type="number" min="0" className="mt-1" placeholder="30" value={form.delai_paiement_jours ?? 30} onChange={e => setForm(f => ({ ...f, delai_paiement_jours: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea className="mt-1 text-sm" rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}

        {/* Infos commande une fois lancée */}
        {order.statut !== "en_attente" && !isCancelled && (
          <div className="grid grid-cols-2 gap-3 mt-3 border-t border-border pt-3">
            <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Fournisseur</span>
              <p className="font-semibold text-sm mt-0.5">{supplierMap[order.supplier_id]?.nom || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Date commande</span>
              <p className="font-semibold text-sm mt-0.5">{order.date_commande || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Livraison prévue</span>
              <p className="font-semibold text-sm mt-0.5">{order.date_livraison_prevue || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
              <span className="text-muted-foreground">Montant total</span>
              <p className="font-semibold text-sm mt-0.5">{(order.montant_total || 0).toLocaleString("fr-FR")} FCFA</p>
            </div>
          </div>
        )}

        {/* Réception de la facture fournisseur (statut recue) — Finances uniquement */}
        {order.statut === "recue" && (
          canHandleInvoice ? (
            <div className="border-t border-border pt-3 mt-3 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-orange-600" /> Réception de la facture fournisseur
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date de facture</Label>
                  <Input type="date" className="mt-1" value={invoiceForm.date_facture} onChange={e => setInvoiceForm(f => ({ ...f, date_facture: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Montant facture (FCFA)</Label>
                  <Input type="number" min="0" className="mt-1" value={invoiceForm.montant_facture} onChange={e => setInvoiceForm(f => ({ ...f, montant_facture: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Scan de la facture</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button type="button" size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => invoiceFileRef.current?.click()} disabled={uploadingInvoice}>
                      <Upload className="w-3.5 h-3.5" /> {uploadingInvoice ? "Envoi..." : invoiceForm.facture_url ? "Remplacer le fichier" : "Choisir un fichier"}
                    </Button>
                    {invoiceForm.facture_url && (
                      <a href={invoiceForm.facture_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Voir le scan</a>
                    )}
                    <input ref={invoiceFileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleInvoiceFile} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-3 mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-2xl px-3 py-3">
              <Receipt className="w-3.5 h-3.5 shrink-0" /> La réception de la facture fournisseur est traitée par le service Finances.
            </div>
          )
        )}

        {/* Facture reçue — échéance de paiement — Finances uniquement */}
        {order.statut === "facture_recue" && (
          canHandleInvoice ? (
            <div className="border-t border-border pt-3 mt-3 grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
                <span className="text-muted-foreground">Date facture</span>
                <p className="font-semibold text-sm mt-0.5">{order.date_facture || "—"}</p>
              </div>
              <div className="bg-muted/50 rounded-2xl px-3 py-3 text-xs">
                <span className="text-muted-foreground">Montant facture</span>
                <p className="font-semibold text-sm mt-0.5">{(order.montant_facture || 0).toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className={cn("col-span-2 rounded-2xl px-3 py-3 text-xs border", echeanceClass)}>
                <span className="opacity-70">Échéance de paiement</span>
                <p className="font-bold text-sm mt-0.5">
                  {order.date_echeance ? new Date(order.date_echeance).toLocaleDateString("fr-FR") : "—"} {echeanceDaysLabel}
                </p>
              </div>
              {order.facture_url && (
                <div className="col-span-2">
                  <a href={order.facture_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📄 Voir la facture scannée</a>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-border pt-3 mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-2xl px-3 py-3">
              <Banknote className="w-3.5 h-3.5 shrink-0" /> Le paiement de cette facture est traité par le service Finances.
            </div>
          )
        )}

        {order.statut === "payee" && (
          <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 text-xs font-semibold mt-3">
            <CheckCircle2 className="w-4 h-4" /> Facture payée le {order.date_paiement} — dépense enregistrée dans Dépenses
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          {(order.statut === "en_attente" || order.statut === "commandee") && (
            <Button variant="outline" className="h-11 rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onCancel(order.id)} disabled={isPending}>
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Annuler commande
            </Button>
          )}
          {order.statut === "en_attente" && (
            <Button variant="outline" className="h-11 rounded-xl font-bold gap-1.5" onClick={handleSaveDraft} disabled={isPending}>
              <Save className="w-3.5 h-3.5" /> Enregistrer
            </Button>
          )}
          <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => onOpenChange(false)}>Fermer</Button>
          {order.statut === "en_attente" && (
            <Button className="flex-1 h-11 rounded-xl font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5" onClick={handleLaunch} disabled={!form.supplier_id || isPending}>
              <Send className="w-3.5 h-3.5" /> {isPending ? "Enregistrement..." : "Lancer la commande"} <ChevronRight className="w-3 h-3" />
            </Button>
          )}
          {order.statut === "commandee" && (
            <Button className="flex-1 h-11 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5" onClick={() => onConfirm(order.id)} disabled={isPending}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {isPending ? "Enregistrement..." : "Marquer confirmée"}
            </Button>
          )}
          {order.statut === "confirmee" && (
            <Button className="flex-1 h-11 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => onReceive(order.id)} disabled={isPending}>
              <Package className="w-3.5 h-3.5" /> {isPending ? "Enregistrement..." : "Marquer reçue"}
            </Button>
          )}
          {order.statut === "recue" && canHandleInvoice && (
            <Button className="flex-1 h-11 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white gap-1.5" onClick={handleConfirmInvoice} disabled={!invoiceForm.date_facture || !invoiceForm.montant_facture || isPending}>
              <Receipt className="w-3.5 h-3.5" /> {isPending ? "Enregistrement..." : "Confirmer réception facture"}
            </Button>
          )}
          {order.statut === "facture_recue" && canHandleInvoice && (
            <Button className="flex-1 h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => onPaid(order.id)} disabled={isPending}>
              <Banknote className="w-3.5 h-3.5" /> {isPending ? "Enregistrement..." : "Marquer payée"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
