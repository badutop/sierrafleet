import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, CheckCircle2, RefreshCw } from "lucide-react";
import DocumentScanner from "@/components/drivers/DocumentScanner";

export default function BonSlot({ index, bon, driver, vehicle, active, onActivate, onCapture, onRemove, onCancel }) {
  const fileInputRef = useRef(null);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onCapture(file, previewUrl);
    e.target.value = "";
  };

  if (active) {
    return (
      <DocumentScanner
        onCapture={onCapture}
        onClose={onCancel}
      />
    );
  }

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${bon ? "border-green-400 bg-green-50/30" : "border-dashed border-muted-foreground/30 bg-muted/20"}`}>
      {!bon ? (
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Bon {index + 1}</p>
              <p className="text-xs text-muted-foreground">Aucune photo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Galerie
            </Button>
            <Button size="sm" className="h-9 px-3 bg-primary" onClick={onActivate}>
              <Camera className="w-4 h-4 mr-1" /> Scanner
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-2">
          <img src={bon.previewUrl} alt={`Bon ${index + 1}`} className="w-16 h-10 object-cover rounded-lg border" />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Bon {index + 1} capturé</span>
            </div>
            {bon.ocrNumber && (
              <p className="text-xs text-muted-foreground font-mono">N° {bon.ocrNumber}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onActivate}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}