import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw } from "lucide-react";

const GUIDE_RATIO = 1.585; // largeur/hauteur (format carte d'identité / permis)

export default function DocumentScanner({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => setReady(true);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const guide = guideRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !guide || !container) return;

    // Dimensions réelles du video stream
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Dimensions affichées dans le DOM
    const containerRect = container.getBoundingClientRect();
    const guideRect = guide.getBoundingClientRect();

    // Ratio entre pixels vidéo et pixels CSS (object-cover)
    // La vidéo est en object-cover dans le container
    const displayW = containerRect.width;
    const displayH = containerRect.height;

    // Facteur de mise à l'échelle object-cover
    const scaleX = vw / displayW;
    const scaleY = vh / displayH;
    // object-cover garde le ratio en coupant, on prend le plus grand facteur
    const scale = Math.max(scaleX, scaleY);

    // Offset de la vidéo centrée en object-cover
    const renderedW = vw / scale;
    const renderedH = vh / scale;
    const offsetX = (displayW - renderedW) / 2;
    const offsetY = (displayH - renderedH) / 2;

    // Position du cadre guide dans les coordonnées vidéo
    const gLeft = (guideRect.left - containerRect.left - offsetX) * scale;
    const gTop = (guideRect.top - containerRect.top - offsetY) * scale;
    const gW = guideRect.width * scale;
    const gH = guideRect.height * scale;

    // Dessine uniquement la zone du document
    canvas.width = Math.round(gW);
    canvas.height = Math.round(gH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, Math.round(gLeft), Math.round(gTop), Math.round(gW), Math.round(gH), 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], "document.jpg", { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      setCaptured({ file, previewUrl });
      stopCamera();
    }, "image/jpeg", 0.95);
  };

  const retake = () => {
    setCaptured(null);
    setReady(false);
    startCamera();
  };

  const confirm = () => {
    onCapture(captured.file, captured.previewUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <span className="text-white text-sm font-medium">Scanner le document</span>
        <button onClick={() => { stopCamera(); onClose(); }} className="text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
        {!captured ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

            {ready && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Cadre de guidage — occupe 85% de la largeur */}
                <div
                  ref={guideRef}
                  className="absolute"
                  style={{
                    left: "7.5%",
                    right: "7.5%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    aspectRatio: `${GUIDE_RATIO} / 1`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.60)",
                    border: "2px solid rgba(255,255,255,0.85)",
                    borderRadius: "8px",
                    zIndex: 10,
                  }}
                >
                  {/* Coins de guidage */}
                  {[
                    ["top-0 left-0", "border-t-2 border-l-2 rounded-tl"],
                    ["top-0 right-0", "border-t-2 border-r-2 rounded-tr"],
                    ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl"],
                    ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute ${pos} w-7 h-7 border-secondary ${cls}`} />
                  ))}
                  <p className="absolute bottom-2 left-0 right-0 text-center text-white/80 text-xs">
                    Alignez le document dans le cadre
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Prévisualisation : uniquement le document recadré */
          <img
            src={captured.previewUrl}
            alt="Document capturé"
            className="max-h-full max-w-full object-contain rounded"
            style={{ background: "#000" }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 px-6 py-5 bg-black/80">
        {!captured ? (
          <button
            onClick={takePhoto}
            disabled={!ready}
            className="w-16 h-16 rounded-full bg-white disabled:opacity-40 flex items-center justify-center shadow-lg"
          >
            <Camera className="w-7 h-7 text-black" />
          </button>
        ) : (
          <>
            <Button variant="outline" onClick={retake} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
              <RotateCcw className="w-4 h-4 mr-2" /> Reprendre
            </Button>
            <Button onClick={confirm} className="bg-secondary hover:bg-secondary/90 text-white px-8">
              Utiliser cette photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}