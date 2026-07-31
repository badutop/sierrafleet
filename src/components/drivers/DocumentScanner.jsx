import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, RotateCw, Crop, Check } from "lucide-react";

const GUIDE_RATIO = 1.585; // largeur/hauteur (format carte d'identité / permis)

// Compression volontairement agressive — ces scans (permis, CNI, cartes
// grises, bons, photo de la pompe...) sont avant tout du texte/tableaux, pas
// de la photo fine : un plafond de résolution + une qualité JPEG réduite
// suffisent largement à rester lisibles tout en divisant la taille du
// fichier par 5-10 par rapport à une capture brute en haute qualité.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.55;
// Espace réservé autour de l'image en mode recadrage pour que les poignées
// (en saillie de ~6px) restent toujours visibles, quel que soit l'appareil.
const HANDLE_MARGIN = 20;

// Applique une rotation (degrés, quelconque) à l'image capturée et renvoie un
// nouveau fichier — le canvas est redimensionné à la boîte englobante de
// l'image tournée (plafonnée à MAX_DIMENSION) pour ne rien couper. Ne dépend
// que de Canvas/Image (DOM standard), donc portable tel quel dans un futur
// wrapper mobile (Capacitor/WebView) sans lib supplémentaire.
function rotateCapturedImage(previewUrl, angleDeg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rad = (angleDeg * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = img.width, h = img.height;
      const boundW = w * cos + h * sin;
      const boundH = w * sin + h * cos;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(boundW, boundH));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(boundW * scale);
      canvas.height = Math.round(boundH * scale);
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.rotate(rad);
      ctx.drawImage(img, -w / 2, -h / 2);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Rotation impossible")); return; }
        const file = new File([blob], "document.jpg", { type: "image/jpeg" });
        resolve({ file, previewUrl: URL.createObjectURL(blob) });
      }, "image/jpeg", JPEG_QUALITY);
    };
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = previewUrl;
  });
}

const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };
const MIN_CROP_SIZE = 0.15;

// Calcule le nouveau cadre selon le côté déplacé — chaque bord garde l'autre
// bord (opposé) fixe comme ancre, contrairement à un déplacement (qui
// translate les 4 côtés ensemble). Tout est exprimé en fractions (0..1) de
// l'image affichée.
function dragCrop(mode, start, dx, dy) {
  switch (mode) {
    case "move": {
      const x = Math.min(Math.max(start.x + dx, 0), 1 - start.w);
      const y = Math.min(Math.max(start.y + dy, 0), 1 - start.h);
      return { x, y, w: start.w, h: start.h };
    }
    case "left": {
      const right = start.x + start.w;
      const x = Math.min(Math.max(start.x + dx, 0), right - MIN_CROP_SIZE);
      return { x, y: start.y, w: right - x, h: start.h };
    }
    case "right": {
      const w = Math.min(Math.max(start.w + dx, MIN_CROP_SIZE), 1 - start.x);
      return { x: start.x, y: start.y, w, h: start.h };
    }
    case "top": {
      const bottom = start.y + start.h;
      const y = Math.min(Math.max(start.y + dy, 0), bottom - MIN_CROP_SIZE);
      return { x: start.x, y, w: start.w, h: bottom - y };
    }
    case "bottom": {
      const h = Math.min(Math.max(start.h + dy, MIN_CROP_SIZE), 1 - start.y);
      return { x: start.x, y: start.y, w: start.w, h };
    }
    default:
      return start;
  }
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
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(null);
  // Ajustement post-capture, en deux temps : d'abord rotation (quart de tour
  // + redressement fin), puis un recadrage optionnel (déplacer/redimensionner
  // un cadre libre sur le résultat déjà tourné) — appliqués via canvas,
  // jamais de recadrage/rotation simultanés pour éviter de mélanger les axes.
  const [orientation, setOrientation] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState(FULL_CROP);
  const cropAreaRef = useRef(null);
  const cropImgRef = useRef(null);
  const dragRef = useRef(null);
  const viewfinderRef = useRef(null);
  // Taille max de l'image en recadrage, mesurée sur le conteneur réel (pas
  // devinée en vh) — une valeur en vh ne tient pas compte du header/footer
  // ni d'une orientation paysage du téléphone (viewport bas), qui peut alors
  // remplir toute la hauteur disponible et couper les poignées haut/bas en
  // saillie. On réserve HANDLE_MARGIN de chaque côté pour qu'elles restent
  // toujours visibles, quels que soient l'appareil et son orientation.
  const [cropMaxSize, setCropMaxSize] = useState(null);

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

  // Le cadre affiché EST la zone du flux vidéo qui sera capturée (le
  // <video> y est en object-cover, exactement à la taille du cadre) : la
  // capture n'a donc qu'à recadrer le flux source au même ratio, par un
  // calcul purement numérique (dimensions natives du flux vs guideRatio) —
  // aucune lecture de position/taille DOM n'est nécessaire, ce qui évite
  // tout décalage lié au rendu CSS (device pixel ratio, timing, etc.).
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    const videoAspect = vw / vh;
    let sx, sy, sw, sh;
    if (videoAspect > guideRatio) {
      // Flux plus large que le cadre cible : on rogne les côtés.
      sh = vh;
      sw = vh * guideRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      // Flux plus haut (ou étroit) que le cadre cible : on rogne haut/bas.
      sw = vw;
      sh = vw / guideRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], "document.jpg", { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      setCaptured({ file, previewUrl });
      stopCamera();
    }, "image/jpeg", JPEG_QUALITY);
  };

  const retake = () => {
    setCaptured(null);
    setOrientation(0);
    setStraighten(0);
    setCropMode(false);
    setCrop(FULL_CROP);
    setReady(false);
    startCamera();
  };

  // Mesure la taille réellement disponible dans le viseur (pas une valeur en
  // vh, qui ignore le header/footer et peut remplir tout l'écran en
  // orientation paysage sur téléphone) pour garantir HANDLE_MARGIN de marge
  // tout autour de l'image en mode recadrage.
  useEffect(() => {
    if (!cropMode) return;
    const measure = () => {
      const el = viewfinderRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCropMaxSize({
        w: Math.max(100, rect.width - HANDLE_MARGIN * 2),
        h: Math.max(100, rect.height - HANDLE_MARGIN * 2),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [cropMode]);

  // Le recadrage se fait toujours sur une image déjà "à plat" (rotation
  // figée) — s'il reste une rotation en attente en entrant en mode
  // recadrage, on la fige d'abord pour que le cadre de recadrage reste aligné
  // sur les axes de l'image affichée.
  const enterCropMode = async () => {
    const angle = orientation + straighten;
    if (angle !== 0) {
      setConfirming(true);
      try {
        const rotated = await rotateCapturedImage(captured.previewUrl, angle);
        setCaptured(rotated);
        setOrientation(0);
        setStraighten(0);
      } catch {
        // La capture d'origine reste utilisable si la rotation échoue.
      } finally {
        setConfirming(false);
      }
    }
    setCrop(FULL_CROP);
    setCropMode(true);
  };

  const cancelCrop = () => {
    setCrop(FULL_CROP);
    setCropMode(false);
  };

  const applyCrop = () => {
    const img = cropImgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) { setCropMode(false); return; }
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const sx = Math.round(crop.x * nw);
    const sy = Math.round(crop.y * nh);
    const sw = Math.round(crop.w * nw);
    const sh = Math.round(crop.h * nh);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setCropMode(false); return; }
      const file = new File([blob], "document.jpg", { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      setCaptured({ file, previewUrl });
      setCropMode(false);
    }, "image/jpeg", JPEG_QUALITY);
  };

  const handleCropPointerDown = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = cropAreaRef.current.getBoundingClientRect();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startCrop: crop, rect };
  };
  const handleCropPointerMove = (e) => {
    const ds = dragRef.current;
    if (!ds) return;
    const dx = (e.clientX - ds.startX) / ds.rect.width;
    const dy = (e.clientY - ds.startY) / ds.rect.height;
    setCrop(dragCrop(ds.mode, ds.startCrop, dx, dy));
  };
  const handleCropPointerUp = () => { dragRef.current = null; };

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

  // Rendu via un portail directement sur document.body : quand ce composant
  // est ouvert depuis un DocSlot niché dans un <Dialog> (DriverDocuments,
  // VehicleDocuments...), le DialogContent de shadcn a un translate-x/-y
  // (transform) — ce qui, par la spec CSS, fait de lui le "containing block"
  // de tout descendant en position:fixed. Résultat sans portail : ce
  // "fixed inset-0" se retrouve confiné à la petite boîte du Dialog (~448px)
  // au lieu du plein écran, laissant beaucoup moins de place que prévu pour
  // le viseur et les poignées de recadrage. Un portail sur document.body
  // sort complètement de cette hiérarchie et garantit un vrai plein écran,
  // que l'appelant soit dans un Dialog ou non (ex: CollecteurBonsPage.jsx,
  // qui n'est pas dans un Dialog et n'a jamais eu ce problème).
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <span className="text-white text-sm font-medium">
          {cropMode ? "Recadrer le document" : "Scanner le document"}
        </span>
        <button onClick={() => { stopCamera(); onClose(); }} className="text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div ref={viewfinderRef} className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        {!captured ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div
              className="relative overflow-hidden shrink-0"
              style={{
                width: `${guideWidthPercent}%`,
                aspectRatio: `${guideRatio} / 1`,
                borderRadius: guideShape === "circle" ? "50%" : "8px",
              }}
            >
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              {/* Coins de guidage — un seul repère visuel, posés directement
                  sur le cadre qui EST la zone capturée (pas de bordure pleine
                  superposée en plus). */}
              {ready && guideShape !== "circle" && [
                ["top-0 left-0", "border-t-2 border-l-2 rounded-tl"],
                ["top-0 right-0", "border-t-2 border-r-2 rounded-tr"],
                ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl"],
                ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br"],
              ].map(([pos, cls], i) => (
                <div key={i} className={`absolute ${pos} w-7 h-7 border-secondary pointer-events-none ${cls}`} />
              ))}
            </div>
            {ready && (
              <p className="text-center text-white/80 text-xs max-w-xs">{instructionText}</p>
            )}
          </div>
        ) : cropMode ? (
          /* Recadrage libre : cadre déplaçable (glisser à l'intérieur) et
             redimensionnable indépendamment depuis chacun de ses 4 côtés,
             sur l'image déjà tournée/redressée. */
          <div
            ref={cropAreaRef}
            className="relative touch-none select-none"
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
          >
            <img
              ref={cropImgRef}
              src={captured.previewUrl}
              alt="Document capturé"
              className="object-contain rounded block"
              style={{
                background: "#000",
                maxWidth: cropMaxSize ? `${cropMaxSize.w}px` : "100%",
                maxHeight: cropMaxSize ? `${cropMaxSize.h}px` : "60vh",
              }}
            />
            <div
              className="absolute border-2 border-secondary bg-secondary/10 cursor-move touch-none"
              style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
              onPointerDown={handleCropPointerDown("move")}
            >
              {[["top-0 left-0", "border-t-2 border-l-2"], ["top-0 right-0", "border-t-2 border-r-2"], ["bottom-0 left-0", "border-b-2 border-l-2"], ["bottom-0 right-0", "border-b-2 border-r-2"]].map(([pos, cls], i) => (
                <div key={i} className={`absolute ${pos} w-5 h-5 border-white ${cls} pointer-events-none`} />
              ))}
              {/* Une poignée par côté — chacune ne déplace que son propre bord */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full bg-secondary border-2 border-white shadow cursor-ns-resize touch-none"
                onPointerDown={handleCropPointerDown("top")}
              />
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full bg-secondary border-2 border-white shadow cursor-ns-resize touch-none"
                onPointerDown={handleCropPointerDown("bottom")}
              />
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-10 rounded-full bg-secondary border-2 border-white shadow cursor-ew-resize touch-none"
                onPointerDown={handleCropPointerDown("left")}
              />
              <div
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-10 rounded-full bg-secondary border-2 border-white shadow cursor-ew-resize touch-none"
                onPointerDown={handleCropPointerDown("right")}
              />
            </div>
          </div>
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
      {captured && !cropMode && (
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
          <button onClick={enterCropMode} disabled={confirming} title="Recadrer" className="text-white/80 hover:text-white p-2 border-l border-white/20 ml-1 pl-3">
            <Crop className="w-5 h-5" />
          </button>
        </div>
      )}
      {cropMode && (
        <p className="text-center text-white/70 text-xs px-6 py-2 bg-black/80 border-t border-white/10">
          Glissez le cadre pour le déplacer, les poignées des 4 côtés pour le redimensionner
        </p>
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
        ) : cropMode ? (
          <>
            <Button variant="outline" onClick={cancelCrop} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
              Annuler
            </Button>
            <Button onClick={applyCrop} className="bg-secondary hover:bg-secondary/90 text-white px-8">
              <Check className="w-4 h-4 mr-2" /> Appliquer le recadrage
            </Button>
          </>
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
    </div>,
    document.body
  );
}
