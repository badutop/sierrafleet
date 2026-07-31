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

function DocSlot({ doc, value, onUpload, onDelete, uploading }) {
  const inputRef = useRef();
  const [scannerOpen, setScannerOpen] = useState(false);
  const Icon = doc.icon;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onUpload(doc.key, file);
    e.target.value = "";
  };

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", value ? "border-border bg-card" : "border-dashed border-border bg-muted/30")}>
      {scannerOpen && (
        <DocumentScanner
          onCapture={(file) => onUpload(doc.key, file)}
          onClose={() => setScannerOpen(false)}
          instructionText={`Alignez ${doc.label} dans le cadre`}
        />
      )}
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
              onClick={() => setScannerOpen(true)}
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
              onClick={() => setScannerOpen(true)}
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
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("drivers").update(data).eq("id", driver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
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

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
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
  );
}
