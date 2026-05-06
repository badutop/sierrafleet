import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Truck, Ship, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const CAMPAIGN_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

export default function RotationsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: rotations = [] } = useQuery({ queryKey: ["rotations-all"], queryFn: () => base44.entities.Rotation.list() });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.Campaign.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });

  const campaignColorMap = useMemo(() => {
    const map = {};
    campaigns.forEach((c, i) => { map[c.id] = CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length]; });
    return map;
  }, [campaigns]);

  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  // Group rotations by date
  const rotsByDate = useMemo(() => {
    const map = {};
    rotations.forEach(r => {
      if (!r.date_rotation) return;
      const dateKey = r.date_rotation.split("T")[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(r);
    });
    return map;
  }, [rotations]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Stats for the month
  const monthRots = rotations.filter(r => {
    if (!r.date_rotation) return false;
    const rd = parseISO(r.date_rotation);
    return isSameMonth(rd, currentMonth);
  });

  const activeCampaignsThisMonth = new Set(monthRots.map(r => r.campaign_id)).size;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendrier des Rotations</h1>
          <p className="text-sm text-muted-foreground">{monthRots.length} rotations · {activeCampaignsThisMonth} campagnes actives ce mois</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-semibold text-sm min-w-[140px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Aujourd'hui</Button>
        </div>
      </div>

      {/* Legend */}
      {campaigns.filter(c => c.statut === "en_cours").length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3">
              {campaigns.filter(c => c.statut === "en_cours").map(c => (
                <div key={c.id} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("w-3 h-3 rounded-full", campaignColorMap[c.id])} />
                  <span className="font-medium">{c.nom_campagne}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground py-3 bg-muted/40">{day}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayRots = rotsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              // Group by campaign, max 3 shown
              const byCampaign = {};
              dayRots.forEach(r => {
                if (!byCampaign[r.campaign_id]) byCampaign[r.campaign_id] = [];
                byCampaign[r.campaign_id].push(r);
              });
              const campaignEntries = Object.entries(byCampaign);

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[100px] p-1.5 border-b border-r border-border",
                    !isCurrentMonth && "bg-muted/20",
                    isToday && "bg-primary/5",
                    idx % 7 === 6 && "border-r-0"
                  )}
                >
                  <div className={cn(
                    "text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-secondary text-secondary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </div>

                  <div className="space-y-0.5">
                    {campaignEntries.slice(0, 3).map(([campId, rots]) => {
                      const campaign = campaignMap[campId];
                      const color = campaignColorMap[campId] || "bg-gray-400";
                      return (
                        <div key={campId} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[10px] font-medium truncate", color)}>
                          <RotateCw className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{rots.length}× {campaign?.nom_campagne || "—"}</span>
                        </div>
                      );
                    })}
                    {campaignEntries.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{campaignEntries.length - 3} autres</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly summary by campaign */}
      {activeCampaignsThisMonth > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...new Set(monthRots.map(r => r.campaign_id))].map(campId => {
            const camp = campaignMap[campId];
            const campRots = monthRots.filter(r => r.campaign_id === campId);
            const tonnage = campRots.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
            const color = campaignColorMap[campId] || "bg-gray-400";
            if (!camp) return null;
            return (
              <Card key={campId} className="overflow-hidden">
                <div className={cn("h-1.5", color)} />
                <CardContent className="pt-3 pb-3 space-y-1 text-xs">
                  <div className="font-bold text-sm truncate">{camp.nom_campagne}</div>
                  <div className="flex gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> {campRots.length} rotations</span>
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {(tonnage / 1000).toFixed(1)} T</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}