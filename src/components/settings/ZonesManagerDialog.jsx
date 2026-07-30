import React, { useState } from "react";
import { useZones } from "@/hooks/use-zones";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Pencil } from "lucide-react";
import ZoneFormDialog from "./ZoneFormDialog";

export default function ZonesManagerDialog({ open, onClose }) {
  const { data: zones = [], isLoading } = useZones();
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const openCreate = () => { setEditingZone(null); setFormOpen(true); };
  const openEdit = (zone) => { setEditingZone(zone); setFormOpen(true); };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-secondary" />Zones
            </DialogTitle>
            <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle zone
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Utilisées dans les modules Clients et Dépôts pour estimer la consommation carburant par rotation.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">N°</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Litrage approx. (L)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map(zone => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-bold">{zone.numero}</TableCell>
                        <TableCell className="font-medium">{zone.libelle}</TableCell>
                        <TableCell className="text-right">{Number(zone.litrage_approximatif)} L</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(zone)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {zones.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune zone — cliquez sur "Nouvelle zone"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      <ZoneFormDialog open={formOpen} onClose={() => setFormOpen(false)} zone={editingZone} existingZones={zones} />
    </>
  );
}
