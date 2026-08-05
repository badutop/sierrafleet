import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fuel, Camera, Upload, X, Coins, ArrowLeft, Save } from "lucide-react";
import { getFuelPricePerLitre } from "@/pages/SettingsPage";
import { uploadFile } from "@/lib/storage";
import DocumentScanner from "@/components/drivers/DocumentScanner";
import { compressImageFile } from "@/lib/imageCompression";
import { isPositiveNumber } from "@/lib/validation";
import { formatFCFA } from "@/lib/numberFormat";

const emptyForm = {
  vehicle_id: "",
  date: new Date().toISOString().split("T")[0],
  station: "",
  litres: "",
  km_compteur: "",
  recu_url: "",
};

export default function FuelSupplyDialog({ open, onOpenChange, vehicles, drivers = [], entry, onSave, isPending }) {
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));
  // Liste des stations paramétrée dans Paramètres > Les Stations d'essence
  // (voir FuelStationsManagerDialog.jsx) au lieu d'une liste figée dans le code.
  const { data: stations = [] } = useQuery({
    queryKey: ["fuel_stations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_stations").select("*").order("nom", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState(emptyForm);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
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
  const litresInvalid = !isPositiveNumber(form.litres);
  const kmCompteurInvalid = !!(form.km_compteur !== "" && Number(form.km_compteur) < 0);
  const isValid = form.vehicle_id && form.date && !litresInvalid && !kmCompteurInvalid;

  const uploadReceiptPhoto = async (file, previewUrl) => {
    setUploadingPhoto(true);
    setPhotoPreview(previewUrl || URL.createObjectURL(file));
    const { file_url } = await uploadFile(file, "fuel-receipts");
    set("recu_url", file_url);
    setUploadingPhoto(false);
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadReceiptPhoto(await compressImageFile(file));
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    set("recu_url", "");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-full mx-auto [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <Fuel className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            {entry ? "Modifier l'approvisionnement" : "Nouvel approvisionnement"}
          </DialogTitle>
        </div>

        <div className="space-y-3 mt-2">
          {/* Véhicule & station */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-primary flex items-center gap-1.5"><Fuel className="w-4 h-4" />Véhicule & station</p>
            <div>
              <Label className="text-sm font-medium">Véhicule <span className="text-green-600 font-bold">*</span></Label>
              <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
                <SelectTrigger className="mt-1.5 h-12 text-sm bg-card">
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id} className="py-3 text-sm">
                      {v.immatriculation}{driverById[v.driver_id] && ` — ${driverById[v.driver_id].prenom} ${driverById[v.driver_id].nom}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Date <span className="text-green-600 font-bold">*</span></Label>
                <Input type="date" className="mt-1.5 h-12 text-sm bg-card" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium">Station</Label>
                <Select value={form.station} onValueChange={v => set("station", v)}>
                  <SelectTrigger className="mt-1.5 h-12 text-sm bg-card">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.length === 0 ? (
                      <SelectItem value="none" disabled className="py-3 text-sm">Aucune station configurée (Paramètres)</SelectItem>
                    ) : (
                      stations.map(s => (
                        <SelectItem key={s.id} value={s.nom} className="py-3 text-sm">{s.nom}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quantité & montant */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5"><Coins className="w-4 h-4" />Quantité & montant</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Litres <span className="text-green-600 font-bold">*</span></Label>
                <Input
                  type="number" inputMode="decimal" min="0"
                  className="mt-1.5 h-12 text-sm bg-card"
                  placeholder="Ex: 150"
                  value={form.litres}
                  onChange={e => set("litres", e.target.value)}
                />
                {form.litres !== "" && litresInvalid && <p className="text-[11px] text-destructive mt-1">Doit être supérieur à 0</p>}
              </div>
              <div>
                <Label className="text-sm font-medium">Km compteur</Label>
                <Input
                  type="number" inputMode="numeric" min="0"
                  className="mt-1.5 h-12 text-sm bg-card"
                  placeholder="Optionnel"
                  value={form.km_compteur}
                  onChange={e => set("km_compteur", e.target.value)}
                />
                {kmCompteurInvalid && <p className="text-[11px] text-destructive mt-1">Ne peut pas être négatif</p>}
              </div>
            </div>
            <div className="bg-card rounded-lg px-4 py-3 flex items-center justify-end text-sm border border-emerald-500/20">
              Montant : <span className="font-bold text-emerald-700 text-base ml-2">{montantCalc > 0 ? formatFCFA(montantCalc) : "—"}</span>
            </div>
          </div>

          {/* Photo reçu */}
          <div>
            <Label className="text-sm font-medium">Photo du reçu</Label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            {scannerOpen && (
              <DocumentScanner
                guideRatio={1.4}
                instructionText="Alignez le reçu dans le cadre"
                onCapture={(file, previewUrl) => uploadReceiptPhoto(file, previewUrl)}
                onClose={() => setScannerOpen(false)}
              />
            )}
            {!photoPreview ? (
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="flex-1 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Scanner avec caméra</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
                  title="Importer un fichier"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Importer</span>
                </button>
              </div>
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

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={() => onSave({ ...form, prix_litre: prixLitre, _montant: montantCalc })}
            disabled={!isValid || isPending || uploadingPhoto}
          >
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Enregistrement..." : uploadingPhoto ? "Photo en cours..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}