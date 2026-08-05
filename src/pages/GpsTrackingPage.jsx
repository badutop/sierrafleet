import React, { useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, RadioTower, AlertTriangle } from "lucide-react";

// Les icônes par défaut de Leaflet référencent des images via des chemins
// relatifs résolus par webpack — cassé sous Vite (404 silencieux, marqueur
// invisible). On reconstruit l'icône par défaut depuis les assets du
// package, seule solution fiable indépendamment du bundler.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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
          Positions en direct des véhicules équipés d'un traceur Traccar (mise à jour toutes les ~25 secondes)
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

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: "60vh" }}>
        <MapContainer center={mapCenter} zoom={linked.length > 0 ? 12 : 6} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {linked.map(d => (
            <Marker key={d.uniqueId} position={[d.latitude, d.longitude]}>
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
