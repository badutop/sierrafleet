import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, RotateCw } from "lucide-react";

const GUIDE_RATIO = 1.585; // largeur/hauteur (format carte d'identité / permis)

// Applique une rotation (degrés, quelconque) à l'image capturée et renvoie un
// nouveau fichier — le canvas est redimensionné à la boîte englobante de
// l'image tournée pour ne rien couper. Ne dépend que de Canvas/Image (DOM
// standard), donc portable tel quel dans un futur wrapper mobile (Capacitor/
// WebView) sans lib supplémentaire.
function rotateCapturedImage(previewUrl, angleDeg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rad = (angleDeg * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = img.width, h = img.height;
      const newW = Math.round(w * cos + h * sin);
      const newH = Math.round(w * sin + h * cos);
      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d");
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -w / 2, -h / 2);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Rotation impossible")); return; }
        const file = new File([blob], "document.jpg", { type: "image/jpeg" });
        resolve({ file, previewUrl: URL.createObjectURL(blob) });
      }, "image/jpeg", 0.95);
    };
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = previewUrl;
  });
}

export default function DocumentScanner({
  onCapture,
  onClose,
  guideRatio = GUIDE_RATIO,
  guideShape = "rect", // "rect" | "circle"
  guideWidthPercent = 85,
  instructionText = "Alignez le document dans le cadre",
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(null);
  // Ajustement post-capture : rotation par quart de tour (orientation) +
  // redressement fin (léger défaut d'angle à la prise) — combinés avant
  // validation, appliqués une seule fois via canvas (pas de recadrage
  // supplémentaire, la capture est déjà cadrée sur le guide).
  const [orientation, setOrientation] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [confirming, setConfirming] = useState(false);

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
    setOrientation(0);
    setStraighten(0);
    setReady(false);
    startCamera();
  };

  const confirm = async () => {
    const angle = orientation + straighten;
    if (angle === 0) {
      onCapture(captured.file, captured.previewUrl);
      onClose();
      return;
    }
    setConfirming(true);
    try {
      const rotated = await rotateCapturedImage(captured.previewUrl, angle);
      onCapture(rotated.file, rotated.previewUrl);
      onClose();
    } catch {
      // En cas d'échec de la rotation, on valide quand même la capture d'origine.
      onCapture(captured.file, captured.previewUrl);
      onClose();
    }
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
                {/* Cadre de guidage — un seul repère visuel (les coins), pas de
                    bordure pleine superposée */}
                <div
                  ref={guideRef}
                  className="absolute"
                  style={{
                    left: `${(100 - guideWidthPercent) / 2}%`,
                    right: `${(100 - guideWidthPercent) / 2}%`,
                    top: "50%",
                    transform: "translateY(-50%)",
                    aspectRatio: `${guideRatio} / 1`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.60)",
                    borderRadius: guideShape === "circle" ? "50%" : "8px",
                    zIndex: 10,
                  }}
                >
                  {/* Coins de guidage (uniquement pour un cadre rectangulaire) */}
                  {guideShape !== "circle" && [
                    ["top-0 left-0", "border-t-2 border-l-2 rounded-tl"],
                    ["top-0 right-0", "border-t-2 border-r-2 rounded-tr"],
                    ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl"],
                    ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute ${pos} w-7 h-7 border-secondary ${cls}`} />
                  ))}
                  <p className="absolute -bottom-7 left-0 right-0 text-center text-white/80 text-xs">
                    {instructionText}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Prévisualisation : uniquement le document recadré, ajustable
             (rotation/redressement) avant validation */
          <img
            src={captured.previewUrl}
            alt="Document capturé"
            className="max-h-full max-w-full object-contain rounded transition-transform duration-150"
            style={{ background: "#000", transform: `rotate(${orientation + straighten}deg)` }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Ajustement post-capture */}
      {captured && (
        <div className="flex items-center justify-center gap-3 px-6 py-3 bg-black/80 border-t border-white/10">
          <button onClick={() => setOrientation(o => (o - 90 + 360) % 360)} title="Tourner à gauche" className="text-white/80 hover:text-white p-2">
            <RotateCcw className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center gap-1 w-40">
            <span className="text-white/70 text-[11px]">Redresser</span>
            <input
              type="range" min={-15} max={15} step={1}
              value={straighten}
              onChange={e => setStraighten(Number(e.target.value))}
              className="w-full accent-secondary"
            />
          </div>
          <button onClick={() => setOrientation(o => (o + 90) % 360)} title="Tourner à droite" className="text-white/80 hover:text-white p-2">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      )}

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
            <Button variant="outline" onClick={retake} disabled={confirming} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
              <RotateCcw className="w-4 h-4 mr-2" /> Reprendre
            </Button>
            <Button onClick={confirm} disabled={confirming} className="bg-secondary hover:bg-secondary/90 text-white px-8">
              {confirming ? "Traitement..." : "Utiliser cette photo"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
