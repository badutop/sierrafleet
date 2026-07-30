import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

const emptyForm = { libelle: "", litrage_approximatif: "" };

// Numéro et code sont figés (voir migration zones) : le numéro suivant est
// attribué automatiquement à la création, jamais modifiable ensuite — seuls
// le libellé et le litrage approximatif le sont.
export default function ZoneFormDialog({ open, onClose, zone, existingZones = [] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(zone ? { libelle: zone.libelle, litrage_approximatif: String(zone.litrage_approximatif) } : emptyForm);
  }, [open, zone]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const numero = (existingZones.reduce((max, z) => Math.max(max, z.numero), 0) || 0) + 1;
      const code = `zone${numero}`;
      const payload = { id: code, numero, code, libelle: data.libelle, litrage_approximatif: Number(data.litrage_approximatif) || 0 };
      const { error } = await supabase.from("zones").insert(payload);
      if (error) throw error;
      await logAudit("Zone", code, "create", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      onClose();
      toast.success("Zone créée");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { libelle: data.libelle, litrage_approximatif: Number(data.litrage_approximatif) || 0 };
      const { error } = await supabase.from("zones").update(payload).eq("id", zone.id);
      if (error) throw error;
      await logAudit("Zone", zone.id, "update", payload, zone, Object.keys(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      onClose();
      toast.success("Zone mise à jour");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const handleSave = () => zone ? updateMutation.mutate(form) : createMutation.mutate(form);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <MapPin className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            {zone ? "Modifier la zone" : "Nouvelle zone"}
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {zone ? `Zone ${zone.numero} — le numéro et le code restent fixes.` : "Le numéro sera attribué automatiquement (zone suivante)."}
        </p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Détails de la zone</p>
            <div>
              <Label className="text-xs">Libellé *</Label>
              <Input className="mt-1 bg-card" placeholder="Ex: Zone Nord — Dakar" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Litrage approximatif (L / rotation) *</Label>
              <Input type="number" min="0" className="mt-1 bg-card" placeholder="Ex: 25" value={form.litrage_approximatif} onChange={e => setForm({ ...form, litrage_approximatif: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={handleSave}
            disabled={isPending || !form.libelle || !form.litrage_approximatif}
          >
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
