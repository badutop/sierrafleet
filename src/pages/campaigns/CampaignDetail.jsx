import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Truck, RotateCw, AlertTriangle, CheckCircle, Fuel, ClipboardList, Play, Pencil, Lock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import RotationSheetEntry from "./RotationSheetEntry";
import DailyDeclarations from "./DailyDeclarations";
import CampaignRotationsTable from "./CampaignRotationsTable";
import FillEfficiencyBar from "@/components/campaigns/FillEfficiencyBar";
import CampaignTruckAssignmentTable from "@/components/campaigns/CampaignTruckAssignmentTable";
import CampaignReport from "@/components/campaigns/CampaignReport";
import CampaignInvoice from "@/components/campaigns/CampaignInvoice";
import { confirm } from "@/lib/confirm";
import { stampStatutDate } from "@/lib/campaignStatus";
import CampaignStatusStepper from "@/components/campaigns/CampaignStatusStepper";

export default function CampaignDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [rotSheetOpen, setRotSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: client } = useQuery({
    queryKey: ["client", campaign?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", campaign.client_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.client_id,
  });
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").eq("campaign_id", id).order("numero_rotation", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const { data: declarations = [] } = useQuery({
    queryKey: ["declarations", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_declarations").select("*").eq("campaign_id", id).order("date_declaration", { ascending: false });
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
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: depots = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("depots").select("*");
      if (error) throw error;
      return data;
    },
  });

  const startCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaigns").update({ statut: "en_cours", ...stampStatutDate(campaign, "en_cours") }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaign", id] }); toast.success("Campagne démarrée"); },
  });

  const closeCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaigns").update({ statut: "terminee", ...stampStatutDate(campaign, "terminee") }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      toast.success("Campagne clôturée");
      setReportOpen(true);
      setTimeout(() => setInvoiceOpen(true), 300);
    },
  });

  if (!campaign) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>;

  const bonsSysteme = rotations.length;
  const bonsPhysiques = rotations.filter(r => r.bon_physique_recu).length;
  const ecart = bonsSysteme - bonsPhysiques;
  const progress = campaign.tonnage_total_prevu > 0 ? Math.min(100, Math.round((campaign.tonnage_realise || 0) / campaign.tonnage_total_prevu * 100)) : 0;
  // Tonnage en kg → tonnes (poids_charge_tonnes stocké en kg selon la fiche)
  const tonnageKg = campaign.tonnage_realise || 0;
  const tonnageT = (tonnageKg / 1000).toFixed(3);
  // Urgent = campagne pas encore terminée/clôturée et date de fin prévue dépassée.
  const isUrgent = !["terminee", "clôturee"].includes(campaign.statut) && campaign.date_fin_prevue && new Date(campaign.date_fin_prevue) < new Date();
  // Camions affectés à cette campagne (mêmes rotations que CampaignTruckAssignmentTable :
  // une ligne rotations pour ce vehicle_id = camion actuellement affecté).
  const assignedVehicleIds = new Set(rotations.map(r => r.vehicle_id));
  const assignedVehicles = vehicles.filter(v => assignedVehicleIds.has(v.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/campaigns"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Retour</Button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{campaign.nom_campagne}</h1>
          <p className="text-sm text-muted-foreground">{client?.nom || "—"} · {campaign.type_marchandise}{campaign.navire ? ` · Navire: ${campaign.navire}` : ""}</p>
        </div>
        <div className="flex gap-2">
          {campaign.statut === "creee" && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => startCampaign.mutate()} disabled={startCampaign.isPending}>
              <Play className="w-4 h-4 mr-2" /> Démarrer
            </Button>
          )}
          {campaign.statut === "en_cours" && (<>
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setRotSheetOpen(true)}>
              <ClipboardList className="w-4 h-4 mr-2" /> Saisir fiche du jour
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-200"
              onClick={async () => { if (await confirm("Clôturer définitivement cette campagne ? Cela marquera la campagne comme terminée et générera le rapport de clôture.")) closeCampaign.mutate(); }}
              disabled={closeCampaign.isPending}
            >
              <Lock className="w-4 h-4 mr-2" /> Clôturer la campagne
            </Button>
          </>)}
          {campaign.statut === "terminee" && (<>
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileText className="w-4 h-4 mr-2" /> Voir le rapport
            </Button>
            <Button variant="outline" onClick={() => setInvoiceOpen(true)} className="border-secondary text-secondary hover:bg-secondary/10">
              <FileText className="w-4 h-4 mr-2" /> Facture
            </Button>
          </>)}
        </div>
      </div>

      {/* Progression du statut */}
      <CampaignStatusStepper campaign={campaign} urgent={isUrgent} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Rotations réalisées", value: campaign.nombre_rotations_realisees || 0, icon: RotateCw, color: "text-primary" },
          { label: "Tonnage livré (T)", value: tonnageT, icon: Truck, color: "text-secondary" },
          { label: "Bons système", value: bonsSysteme, icon: ClipboardList, color: "text-blue-600" },
          { label: ecart > 0 ? `Écart (${ecart})` : "Bons OK", value: bonsPhysiques, icon: ecart > 0 ? AlertTriangle : CheckCircle, color: ecart > 0 ? "text-destructive" : "text-emerald-600" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="text-2xl font-bold mt-1">{kpi.value}</p></div>
                <kpi.icon className={cn("w-8 h-8 opacity-70", kpi.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Avancement tonnage</span>
            <span className="font-semibold">{progress}% — {tonnageT} T / {campaign.tonnage_total_prevu || 0} T prévu</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full"><div className="h-2.5 bg-secondary rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </CardContent>
      </Card>

      {ecart > 0 && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">Écart détecté : {ecart} bon(s) manquant(s) — {bonsSysteme} bons système vs {bonsPhysiques} bons physiques collectés.</p>
        </div>
      )}

      {/* Efficacité de remplissage par camion */}
      {rotations.length > 0 && (() => {
        // Calculer le poids réel total vs capacité théorique cumulée (nb rotations × capacité moyenne des camions)
        const vehicleIds = [...new Set(rotations.map(r => r.vehicle_id))];
        const poidsReel = rotations.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
        const capaciteMoyenne = vehicleIds.reduce((s, vid) => {
          const v = vehicles.find(x => x.id === vid);
          return s + (v?.capacite_charge_tonnes ? v.capacite_charge_tonnes * 1000 : 0);
        }, 0);
        const capaciteTheorique = capaciteMoyenne > 0 ? (capaciteMoyenne / vehicleIds.length) * rotations.length : 0;
        if (capaciteTheorique === 0) return null;
        return (
          <Card>
            <CardContent className="pt-4 pb-4">
              <FillEfficiencyBar poidsReel={poidsReel} capaciteTheorique={capaciteTheorique} label="Efficacité remplissage (poids réel vs capacité théorique)" />
            </CardContent>
          </Card>
        );
      })()}

      {/* Tabs */}
      <Tabs defaultValue="camions">
        <TabsList>
          <TabsTrigger value="camions"><Truck className="w-3.5 h-3.5 mr-1" />Camions affectés</TabsTrigger>
          <TabsTrigger value="rotations">Rotations ({rotations.length})</TabsTrigger>
          <TabsTrigger value="declarations">Fiches journalières ({declarations.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="camions" className="mt-4">
          <CampaignTruckAssignmentTable campaignId={id} />
        </TabsContent>
        <TabsContent value="rotations" className="mt-4">
          <CampaignRotationsTable rotations={rotations} vehicles={vehicles} drivers={drivers} campaignId={id} />
        </TabsContent>
        <TabsContent value="declarations" className="mt-4">
          <DailyDeclarations campaignId={id} declarations={declarations} vehicles={vehicles} campaign={campaign} onOpenFicheJour={() => setRotSheetOpen(true)} />
        </TabsContent>
      </Tabs>

      {/* Facture */}
      {invoiceOpen && (
        <CampaignInvoice
          campaign={campaign}
          client={client}
          rotations={rotations}
          onClose={() => setInvoiceOpen(false)}
        />
      )}

      {/* Rapport de clôture */}
      {reportOpen && (
        <CampaignReport
          campaign={campaign}
          client={client}
          rotations={rotations}
          declarations={declarations}
          vehicles={vehicles}
          drivers={drivers}
          depots={depots}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Saisie fiche journalière */}
      <RotationSheetEntry
        open={rotSheetOpen}
        onClose={() => setRotSheetOpen(false)}
        campaign={campaign}
        client={client}
        vehicles={assignedVehicles}
        drivers={drivers}
        existingRotationsCount={rotations.length}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["rotations", id] });
          queryClient.invalidateQueries({ queryKey: ["campaign", id] });
        }}
      />
    </div>
  );
}