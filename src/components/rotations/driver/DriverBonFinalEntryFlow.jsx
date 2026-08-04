import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, PackageCheck, Loader2, CheckCircle2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import DocumentScanner from "@/components/drivers/DocumentScanner";
import { uploadFile } from "@/lib/storage";
import { logAudit } from "@/lib/auditLog";
import { computeBonFinalEcart, maybeAutoValidateCheckpoint, isGroupFullyDocumented, isWithinManualValidationHours } from "@/lib/driverBonEntry";

// Nouveau flux "chauffeur saisit lui-même" (togglable, voir
// DriverBonEntryToggleCard.jsx) : après avoir livré la marchandise et
// échangé son bon d'enlèvement contre un bon de déchargement chez le
// client, le chauffeur scanne ce second bon lui-même — remplace l'étape
// équivalente jusqu'ici faite plus tard par le Collecteur de bons
// (CollecteurBonsPage.jsx, toujours utilisable, mais qui ne trouvera plus
// rien à traiter pour les rotations déjà closes ici). Même IA
// (analyze-bon), même calcul d'écart automatique (computeBonFinalEcart) que
// dans CollecteurBonsPage.jsx.
//
// Si cette rotation est la 3e du groupe à obtenir son bon de déchargement,
// le refuel est validé automatiquement (maybeAutoValidateCheckpoint) — SAUF
// entre 9h et 20h (isWithinManualValidationHours), où la validation reste
// manuelle par le Responsable des Opérations dans Carburant > Validation :
// l'auto-validation devient l'exception (nuit/tôt le matin) plutôt que la
// règle. Le chauffeur verra alors "en attente de validation" (voir
// getDriverCycleState / DriverRefuelPage.jsx) jusqu'à cette validation.
//
// Props :
//   rotationId — la rotation (déjà avec son bon d'enlèvement) à compléter
//   client, zones — nécessaires pour calculer les litres si le refuel se
//     valide automatiquement à cette étape
//   onClose() — ferme sans suite
//   onDone() — bon enregistré, l'utilisateur a fermé l'écran de succès
export default function DriverBonFinalEntryFlow({ rotationId, client, zones = [], onClose, onDone }) {
  const { user: currentUser } = useAuth();
  const [step, setStep] = useState("capture"); // capture | analyzing | confirm | success
  const [scan, setScan] = useState(null);
  const [rotation, setRotation] = useState(null);
  const [form, setForm] = useState({ poids_tonnes: "", numero_bon_client: "" });
  const [saving, setSaving] = useState(false);

  const capturedRef = useRef(false);
  const handleScannerClose = () => {
    if (!capturedRef.current) onClose();
  };

  const handleCapture = async (file, previewUrl) => {
    capturedRef.current = true;
    setStep("analyzing");
    try {
      const { data: rotData, error: rotError } = await supabase.from("rotations").select("*").eq("id", rotationId).single();
      if (rotError) throw rotError;
      setRotation(rotData);

      const { file_url } = await uploadFile(file, "bon-final-scans");
      setScan({ previewUrl, url: file_url });

      const { data, error } = await supabase.functions.invoke("analyze-bon", { body: { image_url: file_url } });
      if (error) throw error;
      setForm({
        poids_tonnes: data?.poids_tonnes != null ? String(data.poids_tonnes) : "",
        numero_bon_client: data?.numero_bon_client || "",
      });
    } catch (err) {
      toast.warning(`Lecture automatique indisponible — complétez manuellement (${err.message})`);
    } finally {
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    if (!form.poids_tonnes || Number(form.poids_tonnes) <= 0) { toast.error("Poids requis (supérieur à 0)"); return; }

    setSaving(true);
    try {
      const { ecart, observation } = computeBonFinalEcart({
        poidsBonFinal: Number(form.poids_tonnes),
        numeroBonFinal: form.numero_bon_client,
        poidsEnlevement: rotation.poids_charge_tonnes,
        numeroEnlevement: rotation.numero_bon_client,
      });

      const payload = {
        bon_final_scan_url: scan.url,
        bon_final_collecte_le: new Date().toISOString(),
        bon_final_collecte_par: currentUser?.id || null,
        poids_bon_final: Number(form.poids_tonnes),
        numero_bon_final: form.numero_bon_client || null,
        ecart_bon_final: ecart,
        observation_bon_final: observation || null,
      };
      const { error } = await supabase.from("rotations").update(payload).eq("id", rotationId);
      if (error) throw error;
      await logAudit("Rotation", rotationId, "update", payload, rotation, Object.keys(payload));

      // Si cette rotation complète les 3 bons de déchargement du groupe
      // (client, véhicule), le refuel est validé automatiquement — SAUF
      // entre 9h et 20h, où la validation reste manuelle (Responsable des
      // Opérations, Carburant > Validation) : l'auto-validation devient
      // l'exception plutôt que la règle. Relit en base plutôt que de
      // recalculer localement, pour la même raison que DriverBonEntryFlow
      // (compte toujours à jour, y compris juste après ce update).
      const { data: freshRotations, error: fetchErr } = await supabase
        .from("rotations").select("*")
        .eq("client_id", rotation.client_id).eq("vehicle_id", rotation.vehicle_id);
      if (fetchErr) throw fetchErr;
      const merged = freshRotations.map(r => (r.id === rotationId ? { ...r, ...payload } : r));
      if (isGroupFullyDocumented(merged, rotation.client_id, rotation.vehicle_id) && !isWithinManualValidationHours()) {
        await maybeAutoValidateCheckpoint({
          allRotationsAfterInsert: merged,
          clientId: rotation.client_id,
          vehicleId: rotation.vehicle_id,
          client,
          zones,
        });
      }

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
        instructionText="Alignez le bon de déchargement dans le cadre"
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
            <PackageCheck className="w-5 h-5 text-secondary" />
            <span className="font-bold text-sm">Bon de déchargement</span>
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
                  <img src={scan.previewUrl} alt="Bon de déchargement scanné" className="w-full h-40 object-cover" />
                  <a href={scan.url} target="_blank" rel="noreferrer" className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
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
            <div className="flex flex-col items-center text-center gap-6 py-12">
              <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <Button className="w-full h-11 rounded-xl font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={onDone}>
                Terminer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
