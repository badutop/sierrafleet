import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, RadioTower, AlertTriangle, X } from "lucide-react";

// Marqueur "bulle bleue" classique (façon point de géolocalisation Google
// Maps) — halo translucide + point plein, plutôt qu'une silhouette de
// véhicule.
const truckIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;border-radius:50%;background:rgba(37,99,235,0.25);display:flex;align-items:center;justify-content:center;">
    <div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
  </div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
});

const DAKAR_CENTER = [14.6928, -17.4467];

function formatLastUpdate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function GpsTrackingPage() {
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

  // Sur mobile, la carte (60vh) occupe une bonne partie de l'écran — un
  // bouton pour la refermer évite de devoir scroller/recharger la page
  // pour accéder au reste (liste des appareils non rattachés, etc.).
  const [showMap, setShowMap] = useState(true);

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

      {showMap ? (
        <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: "60vh" }}>
          <button
            onClick={() => setShowMap(false)}
            title="Fermer la carte"
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
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setShowMap(true)}>
          <MapPin className="w-4 h-4 mr-2" /> Afficher la carte
        </Button>
      )}

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
