import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileStack, Upload, Camera, ExternalLink, Trash2, Loader2, IdCard, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { confirm } from "@/lib/confirm";
import DocumentScanner from "@/components/drivers/DocumentScanner";
import { compressImageFile } from "@/lib/imageCompression";

const DOCS = [
  {
    key: "doc_permis_url",
    label: "Permis de conduire",
    icon: IdCard,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    key: "doc_cni_url",
    label: "CNI (Carte Nationale d'Identité)",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
];

function DocSlot({ doc, value, onUpload, onScan, onDelete, uploading }) {
  const inputRef = useRef();
  const Icon = doc.icon;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    onUpload(doc.key, await compressImageFile(file));
  };

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", value ? "border-border bg-card" : "border-dashed border-border bg-muted/30")}>
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", doc.bg)}>
          <Icon className={cn("w-5 h-5", doc.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{doc.label}</p>
          {value ? (
            <p className="text-xs text-muted-foreground truncate">Document enregistré</p>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun document</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {value ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={() => window.open(value, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Consulter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onScan(doc.key)}
              disabled={uploading}
              title="Scanner avec caméra"
            >
              <Camera className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              title="Importer un fichier"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(doc.key)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs border-dashed"
              onClick={() => onScan(doc.key)}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Envoi...</>
              ) : (
                <><Camera className="w-3.5 h-3.5 mr-1.5" /> Scanner</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-dashed px-2"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              title="Importer un fichier"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function DriverDocuments({ driver, open, onClose }) {
  const [uploading, setUploading] = useState({});
  // Le scanner est rendu hors du <Dialog> (voir plus bas) — même s'il n'était
  // niché qu'à travers un portail (position DOM), le Dialog de Radix reste
  // son ancêtre React logique tant qu'il est monté à l'intérieur, et son
  // FocusScope/DismissableLayer peut alors intercepter des interactions qui
  // ne sont pourtant pas de vrais clics "extérieurs". En le sortant
  // complètement de l'arbre du Dialog (comme CollecteurBonsPage.jsx, qui n'a
  // jamais eu ce problème), on élimine la cause plutôt que ses symptômes.
  const [scanningKey, setScanningKey] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("drivers").update(data).eq("id", driver.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      // Attendu — sinon mutateAsync (et donc le toast de succès dans
      // handleUpload) peut se résoudre avant que la liste "drivers" n'ait
      // fini de se rafraîchir, laissant une fenêtre où driver (dérivé de
      // cette liste) reste momentanément périmé si on rouvre vite un autre
      // chauffeur.
      await queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });

  const handleUpload = async (key, file) => {
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const { file_url } = await uploadFile(file, "driver-docs");
      await updateMutation.mutateAsync({ [key]: file_url });
      toast.success("Document enregistré");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDelete = async (key) => {
    if (!(await confirm("Supprimer ce document ?"))) return;
    await updateMutation.mutateAsync({ [key]: null });
    toast.success("Document supprimé");
  };

  const handleScanCapture = (file) => {
    if (!scanningKey) return;
    handleUpload(scanningKey, file);
  };

  if (!driver) return null;

  const scanningDoc = DOCS.find(d => d.key === scanningKey);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100"
          onPointerDownOutside={(e) => { if (scanningKey) e.preventDefault(); }}
          onInteractOutside={(e) => { if (scanningKey) e.preventDefault(); }}
        >
          <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
            <FileStack className="w-5 h-5 text-secondary shrink-0" />
            <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
              Documents — {driver.prenom} {driver.nom}
            </DialogTitle>
          </div>
          <div className="space-y-3 mt-2">
            {DOCS.map(doc => (
              <DocSlot
                key={doc.key}
                doc={doc}
                value={driver[doc.key]}
                onUpload={handleUpload}
                onScan={setScanningKey}
                onDelete={handleDelete}
                uploading={uploading[doc.key]}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Formats acceptés : PDF, JPG, PNG, WEBP
          </p>
        </DialogContent>
      </Dialog>

      {/* Rendu en dehors du Dialog (pas seulement via portail DOM) — voir le
          commentaire plus haut sur scanningKey. */}
      {scanningDoc && (
        <DocumentScanner
          onCapture={handleScanCapture}
          onClose={() => setScanningKey(null)}
          instructionText={`Alignez ${scanningDoc.label} dans le cadre`}
        />
      )}
    </>
  );
}
