import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Fuel, Plus, Pencil, MapPin, Phone } from "lucide-react";
import FuelStationFormDialog from "./FuelStationFormDialog";

export default function FuelStationsManagerDialog({ open, onClose }) {
  const { data: stations = [], isLoading } = useQuery({
    queryKey: ["fuel_stations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_stations").select("*").order("nom", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);

  const openCreate = () => { setEditingStation(null); setFormOpen(true); };
  const openEdit = (station) => { setEditingStation(station); setFormOpen(true); };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Fuel className="w-5 h-5 text-orange-600" />Stations d'essence
            </DialogTitle>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle station
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Stations de ravitaillement — nom, emplacement (coordonnées GPS) et contact du gérant.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Emplacement</TableHead>
                      <TableHead>Gérant</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map(station => (
                      <TableRow key={station.id}>
                        <TableCell className="font-medium">{station.nom}</TableCell>
                        <TableCell className="text-xs">
                          {station.adresse || "—"}
                          {station.latitude != null && station.longitude != null && (
                            <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />{station.latitude}, {station.longitude}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {station.telephone_gerant ? (
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{station.telephone_gerant}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(station)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {stations.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Fuel className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune station — cliquez sur "Nouvelle station"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      <FuelStationFormDialog open={formOpen} onClose={() => setFormOpen(false)} station={editingStation} />
    </>
  );
}
