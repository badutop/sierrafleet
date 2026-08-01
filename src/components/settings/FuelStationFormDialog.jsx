import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel, ArrowLeft, Save, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";
import { formatSenegalPhone, isBlankSenegalPhone } from "@/lib/phoneFormat";

const emptyForm = { nom: "", adresse: "", _coords: "", latitude: "", longitude: "", telephone_gerant: "+221 " };

// Parse "lat,lng" en { latitude, longitude } — même convention que
// DepotsEditor.jsx pour la saisie des coordonnées GPS.
const parseCoords = (str) => {
  const parts = str.split(",").map(s => s.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }
  return { latitude: "", longitude: "" };
};

export default function FuelStationFormDialog({ open, onClose, station }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      if (station) {
        const coords = station.latitude != null && station.longitude != null ? `${station.latitude},${station.longitude}` : "";
        setForm({
          nom: station.nom || "",
          adresse: station.adresse || "",
          _coords: coords,
          latitude: station.latitude ?? "",
          longitude: station.longitude ?? "",
          telephone_gerant: station.telephone_gerant || "+221 ",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, station]);

  const updateCoords = (str) => {
    const { latitude, longitude } = parseCoords(str);
    setForm(prev => ({ ...prev, _coords: str, latitude, longitude }));
  };

  const tryGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      updateCoords(`${lat},${lng}`);
    });
  };

  const buildPayload = () => ({
    nom: form.nom,
    adresse: form.adresse || null,
    latitude: form.latitude !== "" ? Number(form.latitude) : null,
    longitude: form.longitude !== "" ? Number(form.longitude) : null,
    telephone_gerant: isBlankSenegalPhone(form.telephone_gerant) ? null : form.telephone_gerant,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const id = crypto.randomUUID();
      const payload = buildPayload();
      const { error } = await supabase.from("fuel_stations").insert({ id, ...payload });
      if (error) throw error;
      await logAudit("Station essence", id, "create", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel_stations"] });
      onClose();
      toast.success("Station créée");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const { error } = await supabase.from("fuel_stations").update(payload).eq("id", station.id);
      if (error) throw error;
      await logAudit("Station essence", station.id, "update", payload, station, Object.keys(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel_stations"] });
      onClose();
      toast.success("Station mise à jour");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const handleSave = () => station ? updateMutation.mutate() : createMutation.mutate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <Fuel className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            {station ? "Modifier la station" : "Nouvelle station"}
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {station ? "Mettez à jour les informations de cette station" : "Renseignez les informations de la nouvelle station"}
        </p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-primary flex items-center gap-1.5"><Fuel className="w-4 h-4" />Détails de la station</p>
            <div>
              <Label className="text-xs">Nom de la station <span className="text-green-600 font-bold">*</span></Label>
              <Input className="mt-1 bg-card" placeholder="Ex: Total Pompiers" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Emplacement</Label>
              <Input className="mt-1 bg-card" placeholder="Rue, quartier, ville..." value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Coordonnées GPS</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  className="bg-card font-mono"
                  placeholder="ex: 14.692800,-17.446700"
                  value={form._coords}
                  onChange={e => updateCoords(e.target.value)}
                />
                <Button type="button" size="sm" variant="outline" className="px-2 shrink-0" title="Utiliser ma position actuelle" onClick={tryGeolocate}>
                  <Navigation className="w-3.5 h-3.5" />
                </Button>
              </div>
              {form.latitude !== "" && form.longitude !== "" && (
                <p className="text-[11px] text-emerald-600 mt-1">✓ Lat: {form.latitude} — Lng: {form.longitude}</p>
              )}
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Téléphone du gérant</Label>
              <Input className="mt-1 bg-card" value={form.telephone_gerant || "+221 "} onChange={e => setForm({ ...form, telephone_gerant: formatSenegalPhone(e.target.value) })} />
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
            disabled={isPending || !form.nom}
          >
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
