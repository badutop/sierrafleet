import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fuel, Camera, X, Image } from "lucide-react";
import { getFuelPricePerLitre } from "@/pages/SettingsPage";
import { uploadFile } from "@/lib/storage";

const stations = [
  { label: "Star Oil - Pompier", value: "Star Oil - Pompier" },
  { label: "Star Oil - SIPS", value: "Star Oil - SIPS" },
  { label: "Star Oil - Sangalkam", value: "Star Oil - Sangalkam" },
  { label: "Elton", value: "Elton" },
  { label: "TOTAL", value: "TOTAL" },
  { label: "SHELL", value: "SHELL" },
];

const emptyForm = {
  vehicle_id: "",
  date: new Date().toISOString().split("T")[0],
  station: "",
  litres: "",
  km_compteur: "",
  recu_url: "",
};

export default function FuelSupplyDialog({ open, onOpenChange, vehicles, entry, onSave, isPending }) {
  const [form, setForm] = useState(emptyForm);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const cameraInputRef = useRef(null);
  const prixLitre = getFuelPricePerLitre();

  useEffect(() => {
    if (entry) {
      setForm({
        id: entry.id,
        vehicle_id: entry.vehicle_id || "",
        date: entry.date || "",
        station: entry.station || "",
        litres: entry.litres || "",
        km_compteur: entry.km_compteur || "",
        recu_url: entry.recu_url || "",
      });
      setPhotoPreview(entry.recu_url || null);
    } else {
      setForm(emptyForm);
      setPhotoPreview(null);
    }
  }, [entry, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const montantCalc = form.litres ? Number(form.litres) * prixLitre : 0;
  const isValid = form.vehicle_id && form.date && form.litres;

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    const { file_url } = await uploadFile(file, "fuel-receipts");
    set("recu_url", file_url);
    setUploadingPhoto(false);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    set("recu_url", "");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Fuel className="w-4 h-4 text-secondary" />
            {entry ? "Modifier l'approvisionnement" : "Nouvel approvisionnement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Véhicule */}
          <div>
            <Label className="text-sm font-medium">Véhicule *</Label>
            <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
              <SelectTrigger className="mt-1.5 h-12 text-sm">
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id} className="py-3 text-sm">
                    {v.immatriculation} — {v.marque} {v.modele}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date + Station */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Date *</Label>
              <Input type="date" className="mt-1.5 h-12 text-sm" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">Station</Label>
              <Select value={form.station} onValueChange={v => set("station", v)}>
                <SelectTrigger className="mt-1.5 h-12 text-sm">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(s => (
                    <SelectItem key={s.value} value={s.value} className="py-3 text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Litres + Km */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Litres *</Label>
              <Input
                type="number" inputMode="decimal" min="0"
                className="mt-1.5 h-12 text-sm"
                placeholder="Ex: 150"
                value={form.litres}
                onChange={e => set("litres", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Km compteur</Label>
              <Input
                type="number" inputMode="numeric" min="0"
                className="mt-1.5 h-12 text-sm"
                placeholder="Optionnel"
                value={form.km_compteur}
                onChange={e => set("km_compteur", e.target.value)}
              />
            </div>
          </div>

          {/* Montant */}
          <div className="bg-muted/60 rounded-lg px-4 py-3 flex items-center justify-end text-sm">
            Montant : <span className="font-bold text-secondary text-base ml-2">{montantCalc > 0 ? montantCalc.toLocaleString("fr-FR") + " FCFA" : "—"}</span>
          </div>

          {/* Photo reçu */}
          <div>
            <Label className="text-sm font-medium">Photo du reçu</Label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            {!photoPreview ? (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="mt-1.5 w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Prendre une photo du reçu</span>
              </button>
            ) : (
              <div className="mt-1.5 relative rounded-lg overflow-hidden border border-border">
                <img src={photoPreview} alt="Reçu" className="w-full max-h-40 object-cover" />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Envoi en cours...</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="flex-1 h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={() => onSave({ ...form, prix_litre: prixLitre, _montant: montantCalc })}
            disabled={!isValid || isPending || uploadingPhoto}
          >
            {isPending ? "Enregistrement..." : uploadingPhoto ? "Photo en cours..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}