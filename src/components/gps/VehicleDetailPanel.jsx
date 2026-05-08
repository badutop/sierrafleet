import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge, Clock, MapPin, Compass, Zap, Route, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

function compassLabel(deg) {
  return DIRECTIONS[Math.round((deg % 360) / 45) % 8];
}

async function getMileage(imei) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const fmt = (d) => d.toISOString().replace("T", " ").slice(0, 19);
  const res = await base44.functions.invoke("tracksolidProxy", {
    action: "mileage",
    imei,
    begin_time: fmt(start),
    end_time: fmt(now),
  });
  return res.data;
}

export default function VehicleDetailPanel({ loc, onClose }) {
  const { data: mileageData } = useQuery({
    queryKey: ["gps-mileage-today", loc?.imei],
    queryFn: () => getMileage(loc.imei),
    enabled: !!loc?.imei,
    staleTime: 60000,
  });

  if (!loc) return null;

  const mileageToday = mileageData?.result?.[0]?.mileage ?? mileageData?.result?.mileage ?? "—";
  const isMoving = loc.speed > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-sm">{loc.vehicleNumber || loc.deviceName}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{loc.imei}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px]", isMoving ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-600")}>
            {isMoving ? "En route" : "Arrêté"}
          </Badge>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/40 p-2.5 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Vitesse</p>
            <p className="text-sm font-bold">{loc.speed || 0} km/h</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5 flex items-center gap-2">
          <Compass className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Direction</p>
            <p className="text-sm font-bold">{compassLabel(loc.direction || 0)} ({loc.direction || 0}°)</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5 flex items-center gap-2">
          <Route className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Km aujourd'hui</p>
            <p className="text-sm font-bold">{typeof mileageToday === "number" ? `${mileageToday.toFixed(1)} km` : mileageToday}</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5 flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Contact (ACC)</p>
            <p className="text-sm font-bold">{loc.acc === 1 ? "ON" : "OFF"}</p>
          </div>
        </div>
      </div>

      {loc.address && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{loc.address}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground border-t border-border pt-2">
        <Clock className="w-3 h-3" />
        Dernière position : {loc.positionTime}
      </div>
    </div>
  );
}