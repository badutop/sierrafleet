import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Navigation, Truck, Activity, RefreshCw, Route, Bell, Gauge, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subHours } from "date-fns";
import VehicleDetailPanel from "@/components/gps/VehicleDetailPanel";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Truck SVG icon factory — direction in degrees, color, pulse for moving
function makeTruckIcon(color, direction = 0, pulse = false, selected = false) {
  const size = selected ? 44 : 36;
  const half = size / 2;
  const ring = selected
    ? `<circle cx="${half}" cy="${half}" r="${half - 2}" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.5"/>`
    : "";
  const pulseAnim = pulse
    ? `<circle cx="${half}" cy="${half}" r="${half - 2}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0">
        <animate attributeName="r" from="${half - 4}" to="${half + 4}" dur="1.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite"/>
      </circle>`
    : "";
  // Truck SVG path (top-view simplified), points upward (north), rotated by direction
  const truckPath = `
    <g transform="rotate(${direction}, ${half}, ${half})">
      <rect x="${half - 7}" y="${half - 11}" width="14" height="20" rx="3" fill="${color}" stroke="white" stroke-width="1.5"/>
      <rect x="${half - 5}" y="${half - 14}" width="10" height="6" rx="2" fill="${color}" stroke="white" stroke-width="1.2"/>
      <rect x="${half - 9}" y="${half + 6}" width="5" height="3" rx="1" fill="white" opacity="0.7"/>
      <rect x="${half + 4}" y="${half + 6}" width="5" height="3" rx="1" fill="white" opacity="0.7"/>
      <rect x="${half - 4}" y="${half - 12}" width="8" height="3" rx="1" fill="white" opacity="0.6"/>
    </g>`;
  const shadow = `<ellipse cx="${half}" cy="${half + 14}" rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>`;
  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 6}" viewBox="0 0 ${size} ${size + 6}" style="overflow:visible">
    ${shadow}
    <circle cx="${half}" cy="${half}" r="${half - 2}" fill="white" opacity="0.95" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"/>
    ${ring}
    ${pulseAnim}
    ${truckPath}
  </svg>`;
  return new L.DivIcon({
    html,
    className: "",
    iconSize: [size, size + 6],
    iconAnchor: [half, half],
  });
}

function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 14, { duration: 1.2 });
  }, [position, map]);
  return null;
}

async function callTracksolid(action, params = {}) {
  const res = await base44.functions.invoke("tracksolidProxy", { action, ...params });
  return res.data;
}

export default function GpsTracking() {
  const [selectedImei, setSelectedImei] = useState(null);
  const [tab, setTab] = useState("live"); // live | track | alarms
  const [trackDateRange, setTrackDateRange] = useState({
    begin: format(subHours(new Date(), 4), "yyyy-MM-dd HH:mm:ss"),
    end: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
  });
  const [flyTo, setFlyTo] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Live locations
  const { data: locData, isLoading: locLoading, refetch: refetchLoc } = useQuery({
    queryKey: ["gps-locations"],
    queryFn: () => callTracksolid("locations"),
    refetchInterval: 30000,
  });

  // Devices list
  const { data: devData } = useQuery({
    queryKey: ["gps-devices"],
    queryFn: () => callTracksolid("devices"),
  });

  // Track history
  const { data: trackData, isLoading: trackLoading, refetch: refetchTrack } = useQuery({
    queryKey: ["gps-track", selectedImei, trackDateRange],
    queryFn: () => selectedImei ? callTracksolid("track", { imei: selectedImei, ...trackDateRange }) : null,
    enabled: !!selectedImei && tab === "track",
  });

  // Alarms
  const { data: alarmData, isLoading: alarmLoading } = useQuery({
    queryKey: ["gps-alarms"],
    queryFn: () => callTracksolid("alarms", {
      imei: selectedImei || "",
      begin_time: format(subHours(new Date(), 24), "yyyy-MM-dd HH:mm:ss"),
      end_time: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    }),
    enabled: tab === "alarms",
  });

  const locations = locData?.result || [];
  const devices = devData?.result || [];
  const trackPoints = trackData?.result || [];
  const alarms = alarmData?.result || [];
  const isDemo = locData?.message?.includes("DEMO");

  const movingCount = locations.filter(l => l.status === "moving" || l.speed > 0).length;
  const parkingCount = locations.filter(l => l.status === "parking" || l.speed === 0).length;

  const selectedLocation = locations.find(l => l.imei === selectedImei);

  const handleSelectVehicle = (loc) => {
    setSelectedImei(loc.imei);
    setFlyTo([loc.lat, loc.lng]);
  };

  const alarmLabels = {
    SPEEDING: { label: "Excès de vitesse", color: "bg-red-500/10 text-red-600" },
    FENCE_OUT: { label: "Sortie de zone", color: "bg-amber-500/10 text-amber-600" },
    FENCE_IN: { label: "Entrée en zone", color: "bg-blue-500/10 text-blue-600" },
    SOS: { label: "SOS", color: "bg-red-600/20 text-red-700" },
    ACC_ON: { label: "Démarrage", color: "bg-emerald-500/10 text-emerald-600" },
    ACC_OFF: { label: "Arrêt moteur", color: "bg-slate-500/10 text-slate-600" },
  };

  const center = locations.length > 0 ? [locations[0].lat, locations[0].lng] : [14.6937, -17.4441];

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Navigation className="w-6 h-6 text-secondary" /> GPS Tracking
          </h1>
          <p className="text-sm text-muted-foreground">
            Localisation temps réel · Tracksolid Pro
            {isDemo && <Badge className="ml-2 text-[10px] bg-amber-500/10 text-amber-600">MODE DÉMO</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => refetchLoc()}
            disabled={locLoading}
            className="h-8 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", locLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl py-3 px-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">En mouvement</p>
            <p className="text-xl font-bold text-emerald-600">{movingCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl py-3 px-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
            <Truck className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">À l'arrêt</p>
            <p className="text-xl font-bold text-slate-600">{parkingCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl py-3 px-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total dispositifs</p>
            <p className="text-xl font-bold text-primary">{locations.length}</p>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Tabs */}
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            {[
              { id: "live", label: "En direct", icon: Activity },
              { id: "track", label: "Trajectoire", icon: Route },
              { id: "alarms", label: "Alertes", icon: Bell },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md font-medium transition-all",
                  tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {/* Live Tab */}
          {tab === "live" && (
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {selectedLocation && (
                <VehicleDetailPanel
                  loc={selectedLocation}
                  onClose={() => setSelectedImei(null)}
                />
              )}
              {locLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin" /></div>
              ) : locations.map(loc => (
                <button
                  key={loc.imei}
                  onClick={() => handleSelectVehicle(loc)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    selectedImei === loc.imei
                      ? "border-secondary bg-secondary/5 shadow-sm"
                      : "border-border bg-card hover:border-secondary/40 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{loc.vehicleNumber || loc.deviceName}</span>
                    <Badge className={cn("text-[10px]", loc.speed > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-600")}>
                      {loc.speed > 0 ? "En route" : "Arrêté"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{loc.speed || 0} km/h</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{loc.positionTime?.slice(11, 16)}</span>
                  </div>
                  {loc.address && <p className="text-[10px] text-muted-foreground mt-1 truncate">{loc.address}</p>}
                </button>
              ))}
            </div>
          )}

          {/* Track Tab */}
          {tab === "track" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Véhicule</label>
                <Select value={selectedImei || ""} onValueChange={setSelectedImei}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.imei} value={l.imei} className="text-xs">
                        {l.vehicleNumber || l.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Début</label>
                <Input
                  type="datetime-local"
                  className="text-xs h-8"
                  value={trackDateRange.begin.replace(" ", "T")}
                  onChange={e => setTrackDateRange(p => ({ ...p, begin: e.target.value.replace("T", " ") + ":00" }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fin</label>
                <Input
                  type="datetime-local"
                  className="text-xs h-8"
                  value={trackDateRange.end.replace(" ", "T")}
                  onChange={e => setTrackDateRange(p => ({ ...p, end: e.target.value.replace("T", " ") + ":00" }))}
                />
              </div>
              <Button size="sm" className="w-full h-8 text-xs bg-secondary hover:bg-secondary/90" onClick={() => refetchTrack()} disabled={!selectedImei || trackLoading}>
                <Route className="w-3.5 h-3.5 mr-1.5" />
                {trackLoading ? "Chargement..." : "Afficher la trajectoire"}
              </Button>
              {trackPoints.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">{trackPoints.length} points · {trackPoints[0]?.positionTime?.slice(11,16)} → {trackPoints[trackPoints.length-1]?.positionTime?.slice(11,16)}</p>
              )}
            </div>
          )}

          {/* Alarms Tab */}
          {tab === "alarms" && (
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {alarmLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin" /></div>
              ) : alarms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Aucune alerte récente</div>
              ) : alarms.map((alarm, i) => {
                const cfg = alarmLabels[alarm.alarmType] || { label: alarm.alarmType, color: "bg-muted text-muted-foreground" };
                return (
                  <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{alarm.alarmTime?.slice(11, 16)}</span>
                    </div>
                    <p className="text-xs font-medium">{alarm.imei}</p>
                    {alarm.address && <p className="text-[10px] text-muted-foreground truncate">{alarm.address}</p>}
                    {alarm.speed > 0 && <p className="text-[10px] text-muted-foreground">{alarm.speed} km/h</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-border shadow min-h-[400px]">
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {flyTo && <MapFlyTo position={flyTo} />}

            {/* Live markers */}
            {tab !== "track" && locations.map(loc => {
              const isMoving = loc.speed > 0;
              const isSelected = selectedImei === loc.imei;
              const color = isSelected ? "#f97316" : isMoving ? "#16a34a" : "#64748b";
              const icon = makeTruckIcon(color, loc.direction || 0, isMoving, isSelected);
              return (
                <Marker
                  key={loc.imei}
                  position={[loc.lat, loc.lng]}
                  icon={icon}
                  eventHandlers={{ click: () => handleSelectVehicle(loc) }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold">{loc.vehicleNumber || loc.deviceName}</p>
                      <p>Vitesse : <strong>{loc.speed || 0} km/h</strong></p>
                      <p>Statut : <strong>{isMoving ? "🟢 En mouvement" : "⚫ Arrêté"}</strong></p>
                      {loc.address && <p>{loc.address}</p>}
                      <p className="text-muted-foreground">{loc.positionTime}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Track polyline + waypoints */}
            {tab === "track" && trackPoints.length > 0 && (
              <>
                {/* Shadow/halo line */}
                <Polyline
                  positions={trackPoints.map(p => [p.lat, p.lng])}
                  color="#f97316"
                  weight={8}
                  opacity={0.18}
                />
                {/* Main trajectory */}
                <Polyline
                  positions={trackPoints.map(p => [p.lat, p.lng])}
                  color="#f97316"
                  weight={3.5}
                  opacity={0.9}
                  dashArray={null}
                />
                {/* Intermediate waypoints every ~10 points */}
                {trackPoints.filter((_, i) => i > 0 && i < trackPoints.length - 1 && i % 10 === 0).map((p, i) => (
                  <Marker key={`wp-${i}`} position={[p.lat, p.lng]} icon={new L.DivIcon({
                    html: `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#f97316" stroke="white" stroke-width="1.5"/></svg>`,
                    className: "", iconSize: [10, 10], iconAnchor: [5, 5]
                  })} />
                ))}
                {/* Truck icon at last position showing direction of travel */}
                <Marker
                  position={[trackPoints[trackPoints.length - 1].lat, trackPoints[trackPoints.length - 1].lng]}
                  icon={makeTruckIcon("#f97316", trackPoints[trackPoints.length - 1].direction || 0, false, true)}
                />
                {/* Start label */}
                <Marker position={[trackPoints[0].lat, trackPoints[0].lng]} icon={new L.DivIcon({
                  html: `<div style="background:#16a34a;color:white;font-size:9px;font-weight:600;padding:3px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚦 Départ</div>`,
                  className: "", iconAnchor: [28, 10]
                })} />
                {/* End label */}
                <Marker position={[trackPoints[trackPoints.length-1].lat, trackPoints[trackPoints.length-1].lng]} icon={new L.DivIcon({
                  html: `<div style="background:#ef4444;color:white;font-size:9px;font-weight:600;padding:3px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-top:32px">🏁 Arrivée</div>`,
                  className: "", iconAnchor: [28, -8]
                })} />
              </>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}