import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarRange } from "lucide-react";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

/**
 * PeriodFilter — filtre par mois, année ou période libre.
 * Props:
 *   filter: { mode: "all"|"month"|"year"|"range", month, year, from, to }
 *   onChange: (newFilter) => void
 */
export default function PeriodFilter({ filter, onChange }) {
  const set = (patch) => onChange({ ...filter, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/40 rounded-xl border border-border">
      <CalendarRange className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />

      {/* Mode */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Période</Label>
        <Select value={filter.mode} onValueChange={v => set({ mode: v })}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les données</SelectItem>
            <SelectItem value="month">Par mois</SelectItem>
            <SelectItem value="year">Par année</SelectItem>
            <SelectItem value="range">Période libre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mois */}
      {filter.mode === "month" && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Mois</Label>
            <Select value={String(filter.month)} onValueChange={v => set({ month: Number(v) })}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Année</Label>
            <Select value={String(filter.year)} onValueChange={v => set({ year: Number(v) })}>
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Année */}
      {filter.mode === "year" && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Année</Label>
          <Select value={String(filter.year)} onValueChange={v => set({ year: Number(v) })}>
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Période libre */}
      {filter.mode === "range" && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Du</Label>
            <Input type="date" className="h-8 text-xs w-36" value={filter.from} onChange={e => set({ from: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Au</Label>
            <Input type="date" className="h-8 text-xs w-36" value={filter.to} onChange={e => set({ to: e.target.value })} />
          </div>
        </>
      )}
    </div>
  );
}

/** Utilitaire : retourne { start, end } ou null selon le filtre */
export function getDateRange(filter) {
  const now = new Date();
  if (filter.mode === "month") {
    const y = filter.year || now.getFullYear();
    const m = (filter.month || now.getMonth() + 1) - 1;
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
  }
  if (filter.mode === "year") {
    const y = filter.year || now.getFullYear();
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
  }
  if (filter.mode === "range" && filter.from && filter.to) {
    return { start: new Date(filter.from), end: new Date(filter.to + "T23:59:59") };
  }
  return null;
}

/** Retourne true si une date est dans la plage (ou plage null = tout) */
export function inRange(dateStr, range) {
  if (!range) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}