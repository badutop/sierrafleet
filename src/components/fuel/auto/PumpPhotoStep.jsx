import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, ArrowLeft, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import DocumentScanner from "@/components/drivers/DocumentScanner";

const DEMO_MODE = true; // ⚡ MODE DÉMO — bypasse la photo de pompe
const DEMO_PUMP_URL = "https://placehold.co/640x480/e2e8f0/64748b?text=POMPE+DEMO";
const DEMO_STATIONS = ["Station Total", "Station Shell", "Station Oryx", "Station Elton"];

// En mode démo (pas de vraie géolocalisation inversée), on fabrique un nom de
// station plausible à partir des coordonnées GPS plutôt que de demander à
// l'utilisateur de la saisir manuellement.
function generateDemoStationName(gps) {
  const seed = gps ? Math.round((Number(gps.lat) + Number(gps.lng)) * 1000) : 0;
  const brand = DEMO_STATIONS[Math.abs(seed) % DEMO_STATIONS.length];
  return gps ? `${brand} — détectée via GPS (${gps.lat}, ${gps.lng})` : `${brand} — détectée automatiquement`;
}

export default function PumpPhotoStep({ driver, vehicle, bons, entries = [], checkpointRotationId = null, onBack, onDone }) {
  const [pumpPhoto, setPumpPhoto] = useState(null); // {file, previewUrl}
  const [station, setStation] = useState("");
  const [litres, setLitres] = useState("");
  const [gps, setGps] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // GPS silencieux : sert uniquement à déterminer automatiquement la station
  // (pas de validation demandée à l'utilisateur).
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) };
        setGps(coords);
        setStation(prev => prev || generateDemoStationName(coords));
      },
      () => setStation(prev => prev || generateDemoStationName(null))
    );
  }, []);

  // Reconduit la dernière recharge de ce camion (champ pré-rempli mais
  // modifiable — pas de proratage automatique en fin de campagne pour l'instant).
  useEffect(() => {
    if (!vehicle) return;
    const last = entries
      .filter(e => e.vehicle_id === vehicle.id && e.litres)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
    if (last) setLitres(String(last.litres));
  }, [vehicle, entries]);

  const handleCapture = (file, previewUrl) => {
    setPumpPhoto({ file, previewUrl });
    setScanning(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPumpPhoto({ file, previewUrl: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const handleConfirm = async () => {
    if ((!pumpPhoto && !DEMO_MODE) || !litres || !station) {
      toast.error("Complétez tous les champs");
      return;
    }
    setSaving(true);

    try {
      // Upload photo pompe (ou URL démo)
      let pumpUrl = DEMO_PUMP_URL;
      if (!DEMO_MODE && pumpPhoto) {
        const { file_url } = await uploadFile(pumpPhoto.file, "pump-photos");
        pumpUrl = file_url;
      } else if (pumpPhoto) {
        const { file_url } = await uploadFile(pumpPhoto.file, "pump-photos");
        pumpUrl = file_url;
      }

      // Crée l'entrée FuelEntry (préfixe "Refuel auto — " pour identification)
      const fuelEntry = { id: crypto.randomUUID() };
      const { error: fuelError } = await supabase.from("fuel_entries").insert({
        id: fuelEntry.id,
        vehicle_id: vehicle.id,
        date: new Date().toISOString().split("T")[0],
        station: `Refuel auto — ${station}`,
        litres: Number(litres),
        montant_total: 0,
        statut: "valide",
        recu_url: pumpUrl,
      });
      if (fuelError) throw fuelError;

      if (checkpointRotationId) {
        // Déclenché depuis Carburant > Validation : les 3 bons ont déjà été
        // confirmés individuellement (CampaignRotationsTable) avant que ce
        // camion n'apparaisse comme éligible. On lie juste le checkpoint au
        // vrai fuel_entries pour qu'il sorte de la liste "en attente".
        const { error: linkError } = await supabase.from("rotations").update({ fuel_entry_id: fuelEntry.id }).eq("id", checkpointRotationId);
        if (linkError) throw linkError;
      } else {
        // Rechargement en libre-service (DriverRefuelPage) : les bons scannés
        // ici sont la confirmation elle-même.
        await Promise.all(
          bons.filter(b => b.rotation?.id).map(async (b) => {
            const { error } = await supabase.from("rotations").update({ bon_physique_recu: true }).eq("id", b.rotation.id);
            if (error) throw error;
          })
        );
      }

      // Envoie la notification WhatsApp (fire & forget)
      sendWhatsAppConfirmation({ driver, vehicle, bons, station, litres, gps, fuelEntry });

      const transaction = {
        id: fuelEntry.id,
        heure: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString("fr-FR"),
        litres,
        station,
        gps,
        bonsNums: bons.map(b => b.ocrNumber).join(", "),
      };

      onDone(transaction);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppConfirmation = async ({ driver, vehicle, bons, station, litres, gps, fuelEntry }) => {
    try {
      const now = new Date();
      const message =
        `✅ *Rechargement Effectué*\n\n` +
        `👤 Chauffeur : ${driver.prenom} ${driver.nom}\n` +
        `🚛 Véhicule : ${vehicle.immatriculation}\n` +
        `⛽ Litres : ${litres} L\n` +
        `🏭 Station : ${station}\n` +
        `📋 Bons : ${bons.map(b => b.ocrNumber).join(", ")}\n` +
        `🕐 Heure : ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}\n` +
        (gps ? `📍 GPS : ${gps.lat}, ${gps.lng}\n` : "") +
        `🆔 Tx : ${fuelEntry.id?.slice(0, 8)}`;

      // Relayé côté serveur (whatsapp-notify) — un fetch() direct depuis le
      // navigateur vers api.callmebot.com est bloqué par CORS.
      const { error } = await supabase.functions.invoke("whatsapp-notify", { body: { message } });
      if (error) console.error("[whatsapp-notify]", error);
    } catch (err) {
      console.error("[whatsapp-notify]", err);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="font-bold text-base">Photo de la pompe</h2>
        <p className="text-xs text-muted-foreground">Photographiez l'écran de la pompe après rechargement</p>
      </div>

      {DEMO_MODE && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800 font-semibold flex items-center gap-1.5">
          ⚡ MODE DÉMO — Photo non requise
        </div>
      )}

      {scanning && (
        <DocumentScanner onCapture={handleCapture} onClose={() => setScanning(false)} />
      )}

      {/* Photo pompe */}
      {!pumpPhoto ? (
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune photo de la pompe</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Galerie
            </Button>
            <Button size="sm" className="bg-primary" onClick={() => setScanning(true)}>
              <Camera className="w-4 h-4 mr-1" /> Scanner
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden">
          <img src={pumpPhoto.previewUrl} alt="Pompe" className="w-full h-48 object-cover" />
          <button
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 text-xs"
            onClick={() => setPumpPhoto(null)}
          >
            ✕
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Photo capturée
            {gps && <span className="ml-auto flex items-center gap-1 opacity-70"><MapPin className="w-3 h-3" />{gps.lat}, {gps.lng}</span>}
          </div>
        </div>
      )}

      {/* Champs — pré-remplis automatiquement (GPS pour la station, dernière
          recharge du camion pour les litres), mais modifiables si besoin */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold">Station / Lieu <span className="font-normal text-muted-foreground">(auto-détectée via GPS)</span></Label>
          <Input className="mt-1" placeholder="Ex: Station Total Dakar" value={station} onChange={e => setStation(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold">Litres servis <span className="font-normal text-muted-foreground">(reconduit de la dernière recharge)</span></Label>
          <Input className="mt-1 w-32" type="number" placeholder="Ex: 150" value={litres} onChange={e => setLitres(e.target.value)} min={1} />
        </div>
      </div>

      {/* GPS */}
      {gps && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-green-600" />
          Position GPS capturée : {gps.lat}, {gps.lng}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={saving}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
        <Button
          className="flex-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6"
          disabled={(!pumpPhoto && !DEMO_MODE) || !litres || !station || saving}
          onClick={handleConfirm}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Confirmer le rechargement
        </Button>
      </div>
    </div>
  );
}