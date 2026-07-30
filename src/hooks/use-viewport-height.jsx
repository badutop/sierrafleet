import { useEffect } from "react";

// Corrige la hauteur de viewport sur les navigateurs qui ne supportent pas
// l'unité CSS dvh (voir index.css .h-viewport / .min-h-viewport) : calcule
// la vraie hauteur visible via window.innerHeight et l'expose en variable
// CSS, recalculée à chaque resize/rotation (barre d'adresse mobile qui
// apparaît/disparaît, clavier virtuel, etc.).
export function useViewportHeight() {
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);
}
