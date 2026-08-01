import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import {
  ALERT_KM_VIDANGE_KEY, ALERT_JOURS_ASSURANCE_KEY, ALERT_JOURS_VISITE_KEY, ALERT_JOURS_PERMIS_KEY,
  getAlertKmVidange, getAlertJoursAssurance, getAlertJoursVisite, getAlertJoursPermis,
} from "@/pages/SettingsPage";

export default function AlertThresholdsDialog({ open, onClose }) {
  const [form, setForm] = useState(() => ({
    kmVidange: getAlertKmVidange(),
    joursAssurance: getAlertJoursAssurance(),
    joursVisite: getAlertJoursVisite(),
    joursPermis: getAlertJoursPermis(),
  }));

  const handleSave = () => {
    localStorage.setItem(ALERT_KM_VIDANGE_KEY, String(form.kmVidange));
    localStorage.setItem(ALERT_JOURS_ASSURANCE_KEY, String(form.joursAssurance));
    localStorage.setItem(ALERT_JOURS_VISITE_KEY, String(form.joursVisite));
    localStorage.setItem(ALERT_JOURS_PERMIS_KEY, String(form.joursPermis));
    toast.success("Seuils d'alerte mis à jour");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            Seuils d'alerte
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Déclenchent les alertes du Tableau de bord pour les véhicules et chauffeurs.
        </p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-primary flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Seuils</p>
            <div>
              <Label className="text-xs">Km avant vidange (alerte)</Label>
              <Input type="number" min="0" className="mt-1 bg-card" value={form.kmVidange} onChange={e => setForm({ ...form, kmVidange: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Jours avant expiration assurance</Label>
              <Input type="number" min="0" className="mt-1 bg-card" value={form.joursAssurance} onChange={e => setForm({ ...form, joursAssurance: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Jours avant expiration visite technique</Label>
              <Input type="number" min="0" className="mt-1 bg-card" value={form.joursVisite} onChange={e => setForm({ ...form, joursVisite: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Jours avant expiration permis</Label>
              <Input type="number" min="0" className="mt-1 bg-card" value={form.joursPermis} onChange={e => setForm({ ...form, joursPermis: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
