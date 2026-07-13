// Redressement automatique de documents scannés (CNI, permis, carte grise...)
// via jscanify (détection de contour + correction de perspective), qui
// s'appuie lui-même sur OpenCV.js chargé depuis le CDN à la demande.
const OPENCV_CDN_URL = "https://docs.opencv.org/4.7.0/opencv.js";

let cvReadyPromise = null;
let scannerPromise = null;

function loadOpenCv() {
  if (typeof window !== "undefined" && window.cv?.Mat) return Promise.resolve(window.cv);
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = OPENCV_CDN_URL;
    script.async = true;
    script.onerror = () => reject(new Error("Échec du chargement d'OpenCV.js"));
    script.onload = () => {
      const cv = window.cv;
      if (cv.Mat) { resolve(cv); return; }
      cv["onRuntimeInitialized"] = () => resolve(cv);
    };
    document.head.appendChild(script);
  });
  return cvReadyPromise;
}

async function getScanner() {
  await loadOpenCv();
  if (!scannerPromise) {
    scannerPromise = import("jscanify/client").then((mod) => {
      const Jscanify = mod.default || mod;
      return new Jscanify();
    });
  }
  return scannerPromise;
}

// Démarre le chargement d'OpenCV.js/jscanify en arrière-plan, sans attendre
// le résultat — à appeler dès l'ouverture du scanner pour que tout soit prêt
// au moment où l'utilisateur prend la photo.
export function prewarmDocumentScanner() {
  getScanner().catch(() => {});
}

/**
 * Détecte le contour d'un document dans `sourceCanvas` et retourne un nouveau
 * canvas redressé (perspective corrigée). Retourne `null` si aucun document
 * n'a pu être détecté (fond complexe, mauvais éclairage...) — l'appelant
 * doit alors garder l'image d'origine.
 */
export async function straightenCanvas(sourceCanvas) {
  try {
    const scanner = await getScanner();
    return scanner.extractPaper(sourceCanvas, sourceCanvas.width, sourceCanvas.height) || null;
  } catch (err) {
    console.error("[documentScan] Détection du document échouée", err);
    return null;
  }
}
