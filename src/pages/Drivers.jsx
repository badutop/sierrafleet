import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, User, Phone, CreditCard, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabels = { actif: "Actif", inactif: "Inactif", en_mission: "En mission" };
const statusColors = { actif: "bg-emerald-500/10 text-emerald-600", inactif: "bg-muted text-muted-foreground", en_mission: "bg-blue-500/10 text-blue-600" };

export default function Drivers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.TripLog.list("-date_depart", 200) });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); setDialogOpen(false); setForm({}); toast.success("Chauffeur ajouté"); },
  });

  const driverStats = {};
  trips.forEach(t => {
    if (!driverStats[t.driver_id]) driverStats[t.driver_id] = { km: 0, missions: 0 };
    driverStats[t.driver_id].km += t.km_parcourus || 0;
    driverStats[t.driver_id].missions += 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground">{drivers.length} chauffeurs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau chauffeur</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[["prenom","Prénom"],["nom","Nom"],["telephone","Téléphone"],["numero_permis","N° Permis"],["categorie_permis","Catégorie"]].map(([k,l]) => (
                <div key={k}><Label className="text-xs">{l}</Label><Input className="mt-1" value={form[k]||""} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
              ))}
              <div><Label className="text-xs">Expiration permis</Label><Input type="date" className="mt-1" value={form.date_expiration_permis||""} onChange={e => setForm({...form, date_expiration_permis: e.target.value})} /></div>
            </div>
            <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Enregistrer</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map(d => {
          const stats = driverStats[d.id] || { km: 0, missions: 0 };
          const now = new Date();
          const permisExpiry = d.date_expiration_permis ? new Date(d.date_expiration_permis) : null;
          const daysLeft = permisExpiry ? Math.floor((permisExpiry - now) / 86400000) : null;

          return (
            <Card key={d.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{d.prenom} {d.nom}</CardTitle>
                      <p className="text-xs text-muted-foreground">Permis {d.categorie_permis || "-"}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", statusColors[d.statut])}>{statusLabels[d.statut]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{d.telephone || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" />Permis</span><span className={cn("font-medium", daysLeft !== null && daysLeft < 60 && "text-destructive")}>{d.date_expiration_permis || "-"}{daysLeft !== null && daysLeft < 60 ? ` (${daysLeft}j)` : ""}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Route className="w-3 h-3" />Km total</span><span className="font-medium">{stats.km.toLocaleString("fr-FR")} km</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Missions</span><span className="font-medium">{stats.missions}</span></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}