import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, RadioTower, AlertTriangle, X } from "lucide-react";

// Icône camion + remorque vue de côté (silhouette classique de semi-remorque,
// générée en SVG) — plus reconnaissable qu'une vue de dessus abstraite, et la
// remorque reste clairement visible et distincte de la cabine. Rendu fixe
// (pas de rotation selon le cap réel) : un dessin en silhouette ne peut de
// toute façon pas pivoter fidèlement sans avoir l'air "penché" à certains
// angles. Palette grise reprise telle quelle du modèle d'icône fourni (pas
// les couleurs Sierra Logistics).
const TRUCK_SVG = `
  <svg width="46" height="20" viewBox="0 0 110 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
    <ellipse cx="55" cy="40" rx="48" ry="3" fill="rgba(0,0,0,0.25)"/>
    <rect x="6" y="10" width="58" height="20" rx="2" fill="#e5e7eb" stroke="#374151" stroke-width="2"/>
    <line x1="24" y1="10" x2="24" y2="30" stroke="#374151" stroke-width="1" opacity="0.5"/>
    <line x1="42" y1="10" x2="42" y2="30" stroke="#374151" stroke-width="1" opacity="0.5"/>
    <rect x="66" y="16" width="16" height="14" rx="2" fill="#4b5563" stroke="#374151" stroke-width="2"/>
    <path d="M66,16 L70,6 L82,6 L82,16 Z" fill="#4b5563" stroke="#374151" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="71,8 80,8 80,14 71,14" fill="#f3f4f6"/>
    <rect x="82" y="19" width="4" height="7" fill="#1f2937"/>
    <circle cx="20" cy="32" r="6" fill="#1f2937" stroke="#374151" stroke-width="1.5"/>
    <circle cx="20" cy="32" r="2" fill="#9ca3af"/>
    <circle cx="46" cy="32" r="6" fill="#1f2937" stroke="#374151" stroke-width="1.5"/>
    <circle cx="46" cy="32" r="2" fill="#9ca3af"/>
    <circle cx="74" cy="32" r="6" fill="#1f2937" stroke="#374151" stroke-width="1.5"/>
    <circle cx="74" cy="32" r="2" fill="#9ca3af"/>
  </svg>
`;

const truckIcon = L.divIcon({
  html: `<div style="width:46px;height:20px;">${TRUCK_SVG}</div>`,
  className: "",
  iconSize: [46, 20],
  iconAnchor: [23, 16],
  popupAnchor: [0, -16],
});

const DAKAR_CENTER = [14.6928, -17.4467];

function formatLastUpdate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function GpsTrackingPage() {
  const navigate = useNavigate();
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // refetchInterval ~25s : suffisant pour du suivi de flotte, pas besoin
  // d'un WebSocket temps réel (voir plan GPS Traccar). L'edge function ne
  // renvoie jamais les identifiants Traccar, uniquement les positions.
  const { data, isLoading, error } = useQuery({
    queryKey: ["traccar-positions"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("traccar-positions", { method: "GET" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    refetchInterval: 25000,
  });

  const devices = data?.devices || [];

  // Trace du trajet parcouru pendant que la page reste ouverte — accumulée
  // en mémoire à chaque rafraîchissement (~25s), pas persistée côté serveur
  // (voir plan GPS Traccar, historique complet hors périmètre V1). Plafond
  // à 200 points par véhicule pour éviter une croissance illimitée.
  const [trails, setTrails] = useState({});
  useEffect(() => {
    if (!devices.length) return;
    setTrails(prev => {
      const next = { ...prev };
      let changed = false;
      for (const d of devices) {
        if (d.latitude == null || d.longitude == null) continue;
        const point = [d.latitude, d.longitude];
        const existing = next[d.uniqueId] || [];
        const last = existing[existing.length - 1];
        if (!last || last[0] !== point[0] || last[1] !== point[1]) {
          next[d.uniqueId] = [...existing, point].slice(-200);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

  const vehicleByTraccarUid = useMemo(
    () => Object.fromEntries(vehicles.filter(v => v.traccar_uid).map(v => [v.traccar_uid, v])),
    [vehicles]
  );

  const linked = devices
    .filter(d => vehicleByTraccarUid[d.uniqueId] && d.latitude != null && d.longitude != null)
    .map(d => ({ ...d, vehicle: vehicleByTraccarUid[d.uniqueId] }));

  const unlinked = devices.filter(d => !vehicleByTraccarUid[d.uniqueId]);

  const mapCenter = linked.length > 0 ? [linked[0].latitude, linked[0].longitude] : DAKAR_CENTER;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-6 h-6 text-secondary" />
          Suivi GPS
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Positions en direct des véhicules équipés d'un traceur Traccar (mise à jour toutes les ~25 secondes) — la trace du trajet s'affiche tant que cette page reste ouverte
        </p>
      </div>

      {error && (
        <Card className="bg-destructive/10 border-destructive/25">
          <CardContent className="pt-4 pb-4 flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Impossible de récupérer les positions GPS ({error.message}). Vérifiez que l'edge function
            <code className="mx-1 font-mono text-xs">traccar-positions</code> est déployée et que les secrets
            <code className="mx-1 font-mono text-xs">TRACCAR_URL</code>/<code className="font-mono text-xs">TRACCAR_USERNAME</code>/<code className="font-mono text-xs">TRACCAR_PASSWORD</code> sont configurés.
          </CardContent>
        </Card>
      )}

      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: "60vh" }}>
        <button
          onClick={() => navigate("/")}
          title="Quitter le suivi GPS"
          className="absolute top-3 right-3 z-[1000] w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
        <MapContainer center={mapCenter} zoom={linked.length > 0 ? 12 : 6} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {linked.map(d => (
            <React.Fragment key={d.uniqueId}>
              {trails[d.uniqueId]?.length > 1 && (
                <Polyline positions={trails[d.uniqueId]} pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.7, dashArray: "6 8" }} />
              )}
              <Marker position={[d.latitude, d.longitude]} icon={truckIcon}>
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold">{d.vehicle.immatriculation}</p>
                    {d.vehicle.code_camion && <p className="text-muted-foreground">{d.vehicle.code_camion}</p>}
                    <p>Vitesse : {d.speed != null ? `${Math.round(d.speed * 1.852)} km/h` : "—"}</p>
                    <p>{d.address || "Adresse inconnue"}</p>
                    <p className="text-muted-foreground">Mis à jour : {formatLastUpdate(d.fixTime)}</p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {!isLoading && devices.length === 0 && !error && (
        <Card>
          <CardContent className="pt-4 pb-4 text-sm text-muted-foreground text-center">
            Aucun appareil Traccar trouvé.
          </CardContent>
        </Card>
      )}

      {unlinked.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <RadioTower className="w-3.5 h-3.5 text-muted-foreground" />
              Appareils Traccar non rattachés à un véhicule
            </p>
            <div className="space-y-1.5">
              {unlinked.map(d => (
                <div key={d.uniqueId} className="text-xs text-muted-foreground flex items-center justify-between border-b border-border/50 last:border-0 pb-1.5 last:pb-0">
                  <span>{d.name || d.uniqueId} <span className="font-mono">({d.uniqueId})</span></span>
                  <span>{d.status === "online" ? "En ligne" : "Hors ligne"}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Rattachez ces appareils à un véhicule dans Parc Véhicules &gt; Modifier &gt; ID Traccar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
