import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Navigation, Activity, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function getLocations() {
  const res = await base44.functions.invoke("tracksolidProxy", { action: "locations" });
  return res.data;
}

export default function GpsLiveWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["gps-locations-widget"],
    queryFn: getLocations,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const locations = data?.result || [];
  const isDemo = data?.message?.includes("DEMO");
  const moving = locations.filter(l => l.speed > 0).length;
  const parked = locations.filter(l => l.speed === 0).length;

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">GPS Tracking</p>
            {isDemo && <Badge className="text-[9px] bg-amber-500/10 text-amber-600 px-1 py-0">DÉMO</Badge>}
          </div>
        </div>
        <Link to="/gps" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Voir carte <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{moving}</p>
              <p className="text-xs text-muted-foreground">En mouvement</p>
            </div>
            <div className="rounded-lg bg-slate-500/5 border border-slate-200 p-3 text-center">
              <p className="text-2xl font-bold text-slate-500">{parked}</p>
              <p className="text-xs text-muted-foreground">À l'arrêt</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {locations.slice(0, 3).map(loc => (
              <div key={loc.imei} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", loc.speed > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                  <span className="text-xs font-medium truncate max-w-[100px]">{loc.vehicleNumber || loc.deviceName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{loc.speed || 0} km/h</span>
              </div>
            ))}
            {locations.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">+{locations.length - 3} autres véhicules</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}