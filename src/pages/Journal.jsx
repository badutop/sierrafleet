import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import ExpenseDashboard from "@/components/journal/ExpenseDashboard";
import ExpenseByVehicleTable from "@/components/journal/ExpenseByVehicleTable";
import VehicleExpenseDetail from "@/components/journal/VehicleExpenseDetail";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: "all", label: "Tous les mois" },
  { value: "01", label: "Janvier" }, { value: "02", label: "Février" },
  { value: "03", label: "Mars" }, { value: "04", label: "Avril" },
  { value: "05", label: "Mai" }, { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" }, { value: "08", label: "Août" },
  { value: "09", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

export default function Journal() {
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR));
  const [filterMonth, setFilterMonth] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("all");

  const { data: expenses = [], isLoading: loadingExp } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date_frais", { ascending: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*").order("date_entretien", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const vMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);

  // Coûts du garage (préventif + correctif), réalisés uniquement — intégrés au
  // journal comme des dépenses en lecture seule. Les pneus sont détachés dans
  // leur propre poste (comme Péage, Rations…) ; le reste des coûts de garage
  // (vidange, freins, pannes diverses...) va dans le poste "Entretien".
  const maintenanceExpenses = useMemo(() => {
    return maintenances
      .filter(m => m.statut === "realise" && Number(m.cout) > 0)
      .map(m => ({
        id: `maint-${m.id}`,
        vehicle_id: m.vehicle_id,
        date_frais: m.date_fin_intervention || m.date_entretien,
        type_frais: m.type_entretien === "pneus" ? "pneus" : "entretien",
        montant: Number(m.cout) || 0,
        description: m.designation || m.type_entretien,
        statut: "valide",
      }));
  }, [maintenances]);

  const allExpenses = useMemo(() => [...expenses, ...maintenanceExpenses], [expenses, maintenanceExpenses]);

  // Filter by year + month + vehicle search text
  const filtered = useMemo(() => {
    return allExpenses.filter(e => {
      if (!e.date_frais) return false;
      const [year, month] = e.date_frais.split("-");
      if (year !== filterYear) return false;
      if (filterMonth !== "all" && month !== filterMonth) return false;
      if (search) {
        const v = vMap[e.vehicle_id];
        const label = v ? `${v.code_camion || ""} ${v.immatriculation}`.toLowerCase() : "";
        if (!label.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [allExpenses, filterYear, filterMonth, search, vMap]);

  // Expenses for the selected vehicle (all year, no month filter) for the detail view
  const vehicleYearExpenses = useMemo(() => {
    if (selectedVehicleId === "all") return [];
    return allExpenses.filter(e => {
      if (!e.date_frais) return false;
      const [year] = e.date_frais.split("-");
      return e.vehicle_id === selectedVehicleId && year === filterYear;
    });
  }, [allExpenses, selectedVehicleId, filterYear]);

  const selectedVehicle = selectedVehicleId !== "all" ? vMap[selectedVehicleId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-secondary" />
          Journal des Dépenses
        </h1>
        <p className="text-sm text-muted-foreground">Tableau détaillé par camion — carburant, péage, rations, contraventions, entretien garage, pneus…</p>
      </div>

      {/* Filtres */}
      <div className="bg-muted border border-sidebar rounded-xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-44 bg-card" placeholder="Camion..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Vehicle picker for detail view */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Détail par véhicule :</span>
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger className="w-72 bg-card">
              <SelectValue placeholder="— Sélectionner un véhicule —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">— Vue globale (tous véhicules) —</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.immatriculation}{driverMap[v.driver_id] && ` — ${driverMap[v.driver_id].prenom} ${driverMap[v.driver_id].nom}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* If a vehicle is selected: show detail view */}
      {selectedVehicle ? (
        <VehicleExpenseDetail
          vehicle={selectedVehicle}
          driver={driverMap[selectedVehicle?.driver_id]}
          expenses={vehicleYearExpenses}
          filterYear={filterYear}
          onClose={() => setSelectedVehicleId("all")}
        />
      ) : (
        <>
          {/* Mini Dashboard */}
          <ExpenseDashboard expenses={filtered} filterYear={filterYear} filterMonth={filterMonth} />
          {/* Table by vehicle */}
          <ExpenseByVehicleTable expenses={filtered} vehicles={vehicles} vMap={vMap} isLoading={loadingExp} />
        </>
      )}
    </div>
  );
}