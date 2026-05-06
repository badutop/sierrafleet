import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
    queryFn: () => base44.entities.Expense.list("-date_frais", 2000),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const vMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);

  // Filter by year + month + vehicle search text
  const filtered = useMemo(() => {
    return expenses.filter(e => {
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
  }, [expenses, filterYear, filterMonth, search, vMap]);

  // Expenses for the selected vehicle (all year, no month filter) for the detail view
  const vehicleYearExpenses = useMemo(() => {
    if (selectedVehicleId === "all") return [];
    return expenses.filter(e => {
      if (!e.date_frais) return false;
      const [year] = e.date_frais.split("-");
      return e.vehicle_id === selectedVehicleId && year === filterYear;
    });
  }, [expenses, selectedVehicleId, filterYear]);

  const selectedVehicle = selectedVehicleId !== "all" ? vMap[selectedVehicleId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal des Dépenses</h1>
          <p className="text-sm text-muted-foreground">Tableau détaillé par camion — carburant, péage, rations, contraventions…</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-44" placeholder="Camion..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Vehicle picker for detail view */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Détail par véhicule :</span>
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="— Sélectionner un véhicule —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">— Vue globale (tous véhicules) —</SelectItem>
            {vehicles.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.code_camion ? `[${v.code_camion}] ` : ""}{v.immatriculation}{v.marque ? ` — ${v.marque}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* If a vehicle is selected: show detail view */}
      {selectedVehicle ? (
        <VehicleExpenseDetail
          vehicle={selectedVehicle}
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