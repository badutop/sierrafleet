import React, { useRef, useState, useEffect } from "react";
import { uploadFile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, User, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DocumentScanner from "@/components/drivers/DocumentScanner";

export default function DriverPhotoField({ value, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (value && !preview) setPreview(value);
    if (!value) setPreview(null);
  }, [value]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const previewUrl = URL.createObjectURL(file);
    const { file_url } = await uploadFile(file, "driver-photos");
    onUploaded(file_url);
    setPreview(previewUrl);
    setUploading(false);
    toast.success("Photo uploadée");
  };

  const handleScanned = async (file, previewUrl) => {
    setUploading(true);
    setPreview(previewUrl);
    const { file_url } = await uploadFile(file, "driver-photos");
    onUploaded(file_url);
    setUploading(false);
    toast.success("Photo uploadée");
  };

  return (
    <div className="col-span-2">
      {scannerOpen && (
        <DocumentScanner
          onCapture={handleScanned}
          onClose={() => setScannerOpen(false)}
          guideRatio={1}
          guideShape="circle"
          guideWidthPercent={55}
          instructionText="Cadrez le visage du chauffeur"
        />
      )}
      <Label className="text-xs">Photo du chauffeur</Label>
      <div className="flex items-center gap-3 mt-1">
        <div className="w-16 h-16 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0 relative">
          {preview ? (
            <img src={preview} alt="Photo chauffeur" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-muted-foreground" />
          )}
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(null); onUploaded(""); }}
              className="absolute -top-0.5 -right-0.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center shadow"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-1">
          <Button
            type="button" size="sm" variant="outline"
            className="flex-1 h-8 text-xs justify-center"
            onClick={() => setScannerOpen(true)}
            disabled={uploading}
          >
            <Camera className="w-3 h-3 mr-1.5" />
            {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Upload...</> : "Prendre une photo"}
          </Button>
          <Button
            type="button" size="sm" variant="outline"
            className="h-8 text-xs px-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3 h-3" />
          </Button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}