import { jsPDF } from "jspdf";

// Convertit une image (File, typiquement issue de DocumentScanner) en un PDF
// d'une page dimensionnée exactement sur le ratio de l'image — pas de marges
// A4 blanches autour, pour que le PDF ressemble à un vrai scan de document.
export async function imageFileToPdfFile(file, filename = "document.pdf") {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });

  const { width, height } = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = dataUrl;
  });

  const doc = new jsPDF({ unit: "px", format: [width, height] });
  // On redessine sur les dimensions réelles de la page créée (plutôt que sur
  // width/height bruts) au cas où jsPDF les aurait réordonnées en interne —
  // l'image couvre ainsi toujours exactement la page, jamais recadrée/décalée.
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.addImage(dataUrl, "JPEG", 0, 0, pageWidth, pageHeight);

  const blob = doc.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}
