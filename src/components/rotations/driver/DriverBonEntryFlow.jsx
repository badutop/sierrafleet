import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ScanLine, Loader2, CheckCircle2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import DocumentScanner from "@/components/drivers/DocumentScanner";
import { uploadFile } from "@/lib/storage";
import { logAudit } from "@/lib/auditLog";
import { consoLitresPourClient, countExistingForClientVehicle } from "@/lib/refuelRules";
import { buildDriverRotationPayload } from "@/lib/driverBonEntry";

// Nouveau flux "chauffeur saisit lui-même" (togglable, voir
// DriverBonEntryToggleCard.jsx) : le chauffeur scanne son bon d'enlèvement
// dès réception, une IA de vision (Edge Function analyze-bon) pré-remplit
// poids et N° de BL, il confirme (ou corrige), et la rotation est créée —
// avec la même forme et les mêmes règles que RotationSheetEntry.jsx
// (fichier non modifié, non touché par ce flux).
//
// Le cycle complet (voir DriverRefuelPage.jsx / getDriverCycleState) est
// enlèvement → déchargement, répété 3 fois, puis rechargement — chaque étape
// se termine par une déconnexion (l'app revient à l'écran de login, cache
// vidé) plutôt que d'enchaîner dans la même session : à la prochaine
// connexion, le chauffeur ne voit que le bouton de l'étape suivante. La
// validation du refuel (une fois les 3 bons de déchargement obtenus) se fait
// désormais dans DriverBonFinalEntryFlow.jsx, pas ici.
//
// Props :
//   driver, vehicle — déjà résolus par DriverRefuelPage.jsx
//   campaign, campaignClients, zones — contexte de la campagne en cours du véhicule
//   onClose() — ferme sans suite
export default function DriverBonEntryFlow({ driver, vehicle, campaign, campaignClients = [], zones = [], onClose }) {
  const { logout } = useAuth();
  const [step, setStep] = useState("capture"); // capture | analyzing | confirm | success
  const [scan, setScan] = useState(null); // { file, previewUrl, url }
  const [form, setForm] = useState({ poids_tonnes: "", numero_bon_client: "", client_id: "" });
  const [saving, setSaving] = useState(false);

  const isSingleClient = campaignClients.length <= 1;
  const soleClientId = campaignClients[0]?.client_id || campaign?.client_id || null;
  const clientMap = Object.fromEntries(campaignClients.filter(cc => cc.client).map(cc => [cc.client_id, cc.client]));
  const resolvedClientId = isSingleClient ? soleClientId : form.client_id;
  const resolvedClient = clientMap[resolvedClientId];

  // DocumentScanner appelle systématiquement son propre onClose() juste
  // après onCapture() lors d'une confirmation réussie (voir confirm() dans
  // DocumentScanner.jsx — pensé pour fermer la caméra, pas tout ce flux).
  // Sans ce garde-fou, cet appel fermerait immédiatement DriverBonEntryFlow
  // (bonFlowOpen -> false côté DriverRefuelPage.jsx) juste après la
  // capture, avant même l'analyse — le chauffeur revenait alors à l'écran
  // d'accueil sans rien voir se passer.
  const capturedRef = useRef(false);
  const handleScannerClose = () => {
    if (!capturedRef.current) onClose();
  };

  const handleCapture = async (file, previewUrl) => {
    capturedRef.current = true;
    setStep("analyzing");
    try {
      const { file_url } = await uploadFile(file, "bon-scans");
      setScan({ file, previewUrl, url: file_url });

      const { data, error } = await supabase.functions.invoke("analyze-bon", { body: { image_url: file_url } });
      if (error) throw error;
      setForm(f => ({
        ...f,
        poids_tonnes: data?.poids_tonnes != null ? String(data.poids_tonnes) : "",
        numero_bon_client: data?.numero_bon_client || "",
      }));
    } catch (err) {
      // L'extraction IA n'est qu'une aide à la saisie — un échec n'empêche
      // jamais de continuer, le chauffeur saisit alors les deux champs lui-même.
      toast.warning(`Lecture automatique indisponible — complétez manuellement (${err.message})`);
    } finally {
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    if (!resolvedClientId) { toast.error("Sélectionnez le client"); return; }
    if (!form.poids_tonnes || Number(form.poids_tonnes) <= 0) { toast.error("Poids requis (supérieur à 0)"); return; }

    setSaving(true);
    try {
      // Lus juste avant l'insertion plutôt que depuis les props (campaign) :
      // ces dernières viennent du cache react-query de DriverRefuelPage, qui
      // ne se rafraîchit qu'en tâche de fond après invalidation — pas assez
      // fiable pour un calcul aussi critique que la position dans le groupe
      // de 3 (numero_rotation/position dupliqués observés en test réel). Un
      // aller-retour DB de plus ici garantit un compte toujours à jour.
      const { data: freshRotations, error: rotFetchError } = await supabase
        .from("rotations").select("*").eq("campaign_id", campaign.id);
      if (rotFetchError) throw rotFetchError;
      const { data: freshCampaign, error: campFetchError } = await supabase
        .from("campaigns").select("*").eq("id", campaign.id).single();
      if (campFetchError) throw campFetchError;

      if (freshCampaign.tonnage_total_prevu > 0 && (freshCampaign.tonnage_realise || 0) + Number(form.poids_tonnes) > freshCampaign.tonnage_total_prevu) {
        toast.error(`Le cumul dépasserait le tonnage prévu de la campagne (${Number(freshCampaign.tonnage_total_prevu).toFixed(2)} T)`);
        return;
      }

      const numeroRotation = freshRotations.length + 1;
      const position = countExistingForClientVehicle(freshRotations, resolvedClientId, vehicle.id) + 1;
      const litresAlloues = consoLitresPourClient(resolvedClient, zones);

      const rotData = buildDriverRotationPayload({
        campaignId: campaign.id,
        vehicleId: vehicle.id,
        clientId: resolvedClientId,
        driverId: driver.id,
        numeroRotation,
        numeroBonClient: form.numero_bon_client,
        poidsTonnes: form.poids_tonnes,
        litresAlloues,
        refuelDeclenche: position % 3 === 0,
        bonScanUrl: scan?.url,
      });

      const { error: rotError } = await supabase.from("rotations").insert(rotData);
      if (rotError) throw rotError;
      await logAudit("Rotation", rotData.id, "create", rotData);

      const { error: campaignError } = await supabase.from("campaigns").update({
        nombre_rotations_realisees: (freshCampaign.nombre_rotations_realisees || 0) + 1,
        tonnage_realise: (freshCampaign.tonnage_realise || 0) + Number(form.poids_tonnes),
      }).eq("id", campaign.id);
      if (campaignError) throw campaignError;

      setStep("success");
    } catch (err) {
      toast.error(`Erreur lors de l'enregistrement : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (step === "capture") {
    return (
      <DocumentScanner
        guideRatio={1.4}
        instructionText="Alignez le bon d'enlèvement dans le cadre"
        onCapture={handleCapture}
        onClose={handleScannerClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-secondary" />
            <span className="font-bold text-sm">Bon d'enlèvement</span>
          </div>
          {step !== "success" && (
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="w-8 h-8 text-secondary animate-spin" />
              <p className="text-sm text-muted-foreground">Lecture du bon en cours...</p>
            </div>
          )}

          {step === "confirm" && (
            <>
              {scan?.previewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={scan.previewUrl} alt="Bon scanné" className="w-full h-40 object-cover" />
                  <a href={scan.url} target="_blank" rel="noreferrer" className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {vehicle?.immatriculation} — {new Date().toLocaleDateString("fr-FR")}
                </p>

                {!isSingleClient && (
                  <div>
                    <Label className="text-xs">Client <span className="text-green-600 font-bold">*</span></Label>
                    <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                      <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                      <SelectContent>
                        {campaignClients.map(cc => cc.client && (
                          <SelectItem key={cc.client_id} value={cc.client_id}>{cc.client.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Poids (tonnes) <span className="text-green-600 font-bold">*</span></Label>
                  <Input
                    type="number" step="0.001" className="mt-1 bg-card"
                    placeholder="Ex: 37.120"
                    value={form.poids_tonnes}
                    onChange={e => setForm(f => ({ ...f, poids_tonnes: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="text-xs">N° de BL</Label>
                  <Input
                    className="mt-1 bg-card font-mono"
                    placeholder="Ex: 6693"
                    value={form.numero_bon_client}
                    onChange={e => setForm(f => ({ ...f, numero_bon_client: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={onClose} disabled={saving}>
                  Annuler
                </Button>
                <Button className="flex-1 h-11 rounded-xl font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleConfirm} disabled={saving}>
                  {saving ? "Enregistrement..." : "Confirmer"}
                </Button>
              </div>
            </>
          )}

          {step === "success" && (
            // Écran volontairement minimal (peu de texte, un grand check
            // vert). "Terminer" déconnecte le chauffeur (retour à l'écran de
            // login, cache vidé) plutôt que de rester dans l'app — à la
            // prochaine connexion, il ne verra que le bouton de l'étape
            // suivante (voir getDriverCycleState).
            <div className="flex flex-col items-center text-center gap-6 py-12">
              <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <Button className="w-full h-11 rounded-xl font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={logout}>
                Terminer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
