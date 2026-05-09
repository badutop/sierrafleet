import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight, Edit3 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Affichage éditable du numéro OCR extrait
function OcrNumberDisplay({ number, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(number || "");

  if (editing) {
    return (
      <Input
        className="h-7 text-xs font-mono w-36"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { setEditing(false); onEdit(val); }}
        autoFocus
        placeholder="N° bon"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80">
      <span className={!number || number === "ILLISIBLE" ? "text-destructive" : "text-foreground"}>{number || "—"}</span>
      <Edit3 className="w-3 h-3 text-muted-foreground" />
    </button>
  );
}

// Badge de validation
function ValidationBadge({ status, reason }) {
  if (status === "loading") return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground flex-shrink-0" />;
  if (status === "valid") return <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />;
  return (
    <div className="flex flex-col items-end flex-shrink-0">
      <XCircle className="w-5 h-5 text-destructive" />
      {reason && <span className="text-[10px] text-destructive max-w-[110px] text-right leading-tight">{reason}</span>}
    </div>
  );
}

// Extraction OCR via LLM (composant invisible)
function OcrRunner({ bon, index, onResult }) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (bon.ocrNumber && bon.ocrNumber !== "ILLISIBLE") {
      onResult(index, bon.ocrNumber);
      return;
    }
    base44.integrations.Core.InvokeLLM({
      prompt: `Extrait UNIQUEMENT le numéro du bon/ticket visible dans cette image. 
Retourne juste le numéro alphanumerique sans espace ni ponctuation.
Si illisible, retourne exactement: ILLISIBLE`,
      file_urls: [bon.previewUrl],
      response_json_schema: { type: "object", properties: { numero: { type: "string" } } }
    })
      .then(res => onResult(index, res?.numero?.trim() || "ILLISIBLE"))
      .catch(() => onResult(index, "ILLISIBLE"));
  }, []);
  return null;
}

const DEMO_MODE = true; // ⚡ MODE DÉMO — bypasse OCR et validation des numéros

export default function BonValidationStep({ bons: initialBons, driver, vehicle, rotations, onBack, onValidated }) {
  const [bons, setBons] = useState(
    initialBons.map((b, i) => DEMO_MODE
      ? { ...b, ocrNumber: `DEMO-BON-${i + 1}`, validStatus: "valid", validReason: null, rotation: rotations.find(r => r.driver_id === driver?.id) || null }
      : { ...b, ocrNumber: null, validStatus: "loading", validReason: null }
    )
  );
  const [ocrResults, setOcrResults] = useState(
    DEMO_MODE ? initialBons.map((_, i) => `DEMO-BON-${i + 1}`) : Array(initialBons.length).fill(null)
  );
  const [litres, setLitres] = useState(150);

  // Quand tous les OCR arrivent, on valide
  const handleOcrResult = (idx, number) => {
    setOcrResults(prev => {
      const next = [...prev];
      next[idx] = number;
      return next;
    });
  };

  // Met à jour le numéro manuellement
  const handleManualEdit = (idx, number) => {
    setOcrResults(prev => {
      const next = [...prev];
      next[idx] = number;
      return next;
    });
  };

  // Déclenche la validation dès que tous les OCR sont remplis
  useEffect(() => {
    if (ocrResults.some(r => r === null)) return;
    const used = new Set();
    setBons(prev => prev.map((bon, i) => {
      const num = ocrResults[i]?.trim();
      const updated = { ...bon, ocrNumber: num };
      if (!num || num === "ILLISIBLE") return { ...updated, validStatus: "invalid", validReason: "OCR illisible" };
      if (used.has(num)) return { ...updated, validStatus: "invalid", validReason: "Bon dupliqué" };
      used.add(num);
      const match = rotations.find(r =>
        r.driver_id === driver?.id &&
        r.numero_bon_client?.trim() === num &&
        r.statut !== "annulee"
      );
      if (!match) return { ...updated, validStatus: "invalid", validReason: "Bon introuvable" };
      if (match.bon_physique_recu) return { ...updated, validStatus: "invalid", validReason: "Bon déjà utilisé" };
      if (match.vehicle_id && vehicle?.id && match.vehicle_id !== vehicle.id)
        return { ...updated, validStatus: "invalid", validReason: "Mauvais véhicule" };
      return { ...updated, validStatus: "valid", rotation: match };
    }));
  }, [ocrResults]);

  // Re-valide quand l'utilisateur édite manuellement
  const handleEditAndRevalidate = (idx, number) => {
    handleManualEdit(idx, number);
  };

  const allOcrDone = ocrResults.every(r => r !== null);
  const allValid = bons.every(b => b.validStatus === "valid");

  return (
    <div className="p-5 space-y-5">
      {/* Runners OCR invisibles (désactivés en mode démo) */}
      {!DEMO_MODE && initialBons.map((bon, i) => (
        <OcrRunner key={i} bon={bon} index={i} onResult={handleOcrResult} />
      ))}

      <div>
        <h2 className="font-bold text-base">Validation des bons</h2>
        <p className="text-xs text-muted-foreground">Extraction OCR et vérification automatique</p>
        {DEMO_MODE && (
          <div className="mt-2 bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-800 font-semibold flex items-center gap-1.5">
            ⚡ MODE DÉMO — Numéros et validation bypasses
          </div>
        )}
      </div>

      {/* Chauffeur / Véhicule */}
      <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
          {driver?.prenom?.[0]}{driver?.nom?.[0]}
        </div>
        <div>
          <p className="font-semibold text-sm">{driver?.prenom} {driver?.nom}</p>
          <p className="text-xs text-muted-foreground font-mono">{vehicle?.immatriculation}</p>
        </div>
      </div>

      {/* Bons */}
      <div className="space-y-3">
        {bons.map((bon, i) => (
          <div
            key={i}
            className={`border rounded-xl p-3 transition-all ${
              bon.validStatus === "valid" ? "border-green-400 bg-green-50/30" :
              bon.validStatus === "invalid" ? "border-destructive/40 bg-destructive/5" :
              "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <img src={bon.previewUrl} alt={`Bon ${i+1}`} className="w-16 h-10 object-cover rounded-lg border flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-1">Bon {i + 1}</p>
                {ocrResults[i] !== null ? (
                  <OcrNumberDisplay
                    number={ocrResults[i]}
                    onEdit={(num) => handleEditAndRevalidate(i, num)}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Analyse OCR...
                  </span>
                )}
              </div>
              <ValidationBadge status={bon.validStatus} reason={bon.validReason} />
            </div>
          </div>
        ))}
      </div>

      {/* Litres */}
      <div>
        <Label className="text-xs font-semibold">Litres à charger</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input type="number" className="w-24 h-10" value={litres} onChange={e => setLitres(Number(e.target.value))} min={1} />
          <span className="text-sm text-muted-foreground">litres</span>
        </div>
      </div>

      {/* Résultat global */}
      {allOcrDone && (
        <div className={`rounded-xl p-3 text-center text-sm font-semibold ${allValid ? "bg-green-100 text-green-800" : "bg-destructive/10 text-destructive"}`}>
          {allValid
            ? "✅ Les 3 bons sont valides — rechargement autorisé"
            : "❌ Certains bons sont invalides — corrigez ou reprenez la photo"}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
        <Button
          className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-bold"
          disabled={!allValid}
          onClick={() => onValidated(bons)}
        >
          <ArrowRight className="w-4 h-4 mr-2" /> Demander le rechargement
        </Button>
      </div>
    </div>
  );
}