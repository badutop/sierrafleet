import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Navigation } from "lucide-react";

const zoneLabels = { zone1: "Zone 1", zone2: "Zone 2", zone3: "Zone 3", zone4: "Zone 4" };
const zoneConso  = { zone1: "8–10 L", zone2: "25 L", zone3: "30 L", zone4: "40 L" };
const zoneColors = {
  zone1: "bg-green-500/10 text-green-700 border-green-500/30",
  zone2: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  zone3: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  zone4: "bg-red-500/10 text-red-700 border-red-500/30",
};

const emptyDepot = () => ({ nom_depot: "", adresse: "", latitude: "", longitude: "", zone: "zone1", _coords: "" });

// Parse "lat,lng" string into { latitude, longitude }
const parseCoords = (str) => {
  const parts = str.split(",").map(s => s.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }
  return { latitude: "", longitude: "" };
};

export default function DepotsEditor({ depots, onChange }) {
  const add = () => onChange([...depots, emptyDepot()]);

  const remove = (i) => onChange(depots.filter((_, idx) => idx !== i));

  const update = (i, field, value) => {
    const updated = depots.map((d, idx) => idx === i ? { ...d, [field]: value } : d);
    onChange(updated);
  };

  const updateCoords = (i, str) => {
    const { latitude, longitude } = parseCoords(str);
    const updated = depots.map((d, idx) => idx === i ? { ...d, _coords: str, latitude, longitude } : d);
    onChange(updated);
  };

  const tryGeolocate = (i) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const str = `${lat},${lng}`;
      updateCoords(i, str);
    });
  };

  // Get display value for coords field
  const getCoordsDisplay = (depot) => {
    if (depot._coords !== undefined) return depot._coords;
    if (depot.latitude !== "" && depot.longitude !== "") return `${depot.latitude},${depot.longitude}`;
    return "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dépôts ({depots.length})
        </p>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={add}>
          <Plus className="w-3 h-3" /> Ajouter un dépôt
        </Button>
      </div>

      {depots.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
          Aucun dépôt — cliquez sur "Ajouter un dépôt"
        </div>
      )}

      {depots.map((depot, i) => (
        <div key={i} className="border border-border rounded-lg p-3 space-y-2.5 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-card-foreground">Dépôt {i + 1}</span>
            <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Nom + Zone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Nom du dépôt *</Label>
              <Input
                className="mt-0.5 h-8 text-xs"
                placeholder="ex: Dépôt Nord"
                value={depot.nom_depot}
                onChange={e => update(i, "nom_depot", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Zone *</Label>
              <Select value={depot.zone} onValueChange={v => update(i, "zone", v)}>
                <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(zoneLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span>{v}</span>
                      <span className="ml-2 text-muted-foreground text-[10px]">({zoneConso[k]}/rot.)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Badge zone info */}
          <div className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${zoneColors[depot.zone]}`}>
            <MapPin className="w-2.5 h-2.5" />
            {zoneLabels[depot.zone]} — conso. estimée {zoneConso[depot.zone]} / rotation
          </div>

          {/* Adresse */}
          <div>
            <Label className="text-[10px] text-muted-foreground">Adresse</Label>
            <Input
              className="mt-0.5 h-8 text-xs"
              placeholder="Rue, quartier, ville..."
              value={depot.adresse}
              onChange={e => update(i, "adresse", e.target.value)}
            />
          </div>

          {/* GPS coords — format standard "lat,lng" */}
          <div>
            <Label className="text-[10px] text-muted-foreground">Coordonnées GPS</Label>
            <div className="flex gap-1.5 mt-0.5">
              <Input
                className="h-8 text-xs font-mono flex-1"
                placeholder="ex: 14.692800,-17.446700"
                value={getCoordsDisplay(depot)}
                onChange={e => updateCoords(i, e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2 shrink-0"
                title="Utiliser ma position actuelle"
                onClick={() => tryGeolocate(i)}
              >
                <Navigation className="w-3 h-3" />
              </Button>
            </div>
            {depot.latitude !== "" && depot.longitude !== "" && (
              <p className="text-[10px] text-green-600 mt-0.5">✓ Lat: {depot.latitude} — Lng: {depot.longitude}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}