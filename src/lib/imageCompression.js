// Recompresse une image côté client avant upload : redimensionne au besoin
// (plafond sur le plus grand côté) et réencode en JPEG à qualité réduite —
// utilisé pour les photos prises/importées manuellement (galerie, appareil
// photo natif du téléphone), qui peuvent arriver en plusieurs Mo. Les scans
// via DocumentScanner sont déjà compressés à la capture (voir ce fichier) et
// n'ont pas besoin de repasser par ici. Un fichier non-image (ex: PDF importé
// manuellement) est renvoyé tel quel.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.55;

export async function compressImageFile(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image illisible"));
    image.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;

  const name = file.name.replace(/\.[^./]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
