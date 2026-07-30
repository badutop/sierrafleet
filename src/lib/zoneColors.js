// Palette de couleurs cyclique pour l'affichage des zones (paramétrables
// depuis Paramètres > Zones — voir hooks/use-zones.jsx — leur nombre n'est
// pas figé, d'où un cycle plutôt qu'une couleur par code fixe).
const PALETTE = [
  { badge: "bg-green-500/10 text-green-600", box: "bg-green-500/5 border-green-500/20", border: "border-green-500/30" },
  { badge: "bg-blue-500/10 text-blue-600", box: "bg-blue-500/5 border-blue-500/20", border: "border-blue-500/30" },
  { badge: "bg-amber-500/10 text-amber-600", box: "bg-amber-500/5 border-amber-500/20", border: "border-amber-500/30" },
  { badge: "bg-red-500/10 text-red-600", box: "bg-red-500/5 border-red-500/20", border: "border-red-500/30" },
  { badge: "bg-purple-500/10 text-purple-600", box: "bg-purple-500/5 border-purple-500/20", border: "border-purple-500/30" },
  { badge: "bg-teal-500/10 text-teal-600", box: "bg-teal-500/5 border-teal-500/20", border: "border-teal-500/30" },
];

export function getZoneColors(index) {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
