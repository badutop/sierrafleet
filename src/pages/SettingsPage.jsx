import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Settings, Fuel, Save, FileText, MessageCircle } from "lucide-react";
import { getPrixTonne, getTvaPct, INVOICE_PRICE_KEY, INVOICE_TVA_KEY } from "@/components/campaigns/CampaignInvoice";
import { toast } from "sonner";

export const FUEL_PRICE_KEY = "sierra_fuel_price_per_litre";
export function getFuelPricePerLitre() {
  return Number(localStorage.getItem(FUEL_PRICE_KEY) || 650);
}

// Sauvegarde/lecture d'un AppSetting en base
async function readSetting(key) {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value || "";
}
async function saveSetting(key, value) {
  // app_settings.key est UNIQUE, upsert fait le create-ou-update en un aller-retour
  await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
}

export default function SettingsPage() {
  const [fuelPrice, setFuelPrice] = useState(() => getFuelPricePerLitre());
  const [fuelSaved, setFuelSaved] = useState(false);
  const [prixTonne, setPrixTonne] = useState(() => getPrixTonne());
  const [tvaPct, setTvaPct] = useState(() => getTvaPct());
  const [invoiceSaved, setInvoiceSaved] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waApiKey, setWaApiKey] = useState("");
  const [waSaved, setWaSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Charge les settings WhatsApp depuis la base au montage
  useEffect(() => {
    readSetting("wa_alert_phone").then(setWaPhone);
    readSetting("wa_alert_apikey").then(setWaApiKey);
  }, []);

  const saveWaSettings = async () => {
    await Promise.all([
      saveSetting("wa_alert_phone", waPhone.trim()),
      saveSetting("wa_alert_apikey", waApiKey.trim()),
    ]);
    setWaSaved(true);
    setTimeout(() => setWaSaved(false), 2000);
    toast.success("Paramètres WhatsApp enregistrés");
  };

  const saveInvoiceSettings = () => {
    localStorage.setItem(INVOICE_PRICE_KEY, String(prixTonne));
    localStorage.setItem(INVOICE_TVA_KEY, String(tvaPct));
    setInvoiceSaved(true);
    setTimeout(() => setInvoiceSaved(false), 2000);
    toast.success("Paramètres de facturation enregistrés");
  };

  const saveFuelPrice = () => {
    localStorage.setItem(FUEL_PRICE_KEY, String(fuelPrice));
    setFuelSaved(true);
    setTimeout(() => setFuelSaved(false), 2000);
    toast.success("Prix du carburant mis à jour");
  };

  const exportJSON = async () => {
    setExporting(true);
    try {
      const [vehicles, drivers, trips, fuel, maint] = await Promise.all([
        supabase.from("vehicles").select("*").then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from("drivers").select("*").then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from("trip_logs").select("*").order("date_depart", { ascending: false }).limit(500).then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from("fuel_entries").select("*").order("date", { ascending: false }).limit(500).then(r => { if (r.error) throw r.error; return r.data; }),
        supabase.from("maintenance").select("*").order("date_entretien", { ascending: false }).limit(500).then(r => { if (r.error) throw r.error; return r.data; }),
      ]);
      const data = { vehicles, drivers, trips, fuel, maintenances: maint, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sierra_fleet_export.json"; a.click();
      toast.success("Export terminé");
    } catch (err) {
      toast.error("Erreur lors de l'export : " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration de l'application</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Fuel className="w-4 h-4 text-secondary" />Carburant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Prix du carburant (FCFA / litre)</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" min="0" value={fuelPrice} onChange={e => setFuelPrice(Number(e.target.value))} placeholder="Ex: 650" />
                <Button size="sm" onClick={saveFuelPrice} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  <Save className="w-4 h-4 mr-1" />{fuelSaved ? "Sauvegardé !" : "Sauvegarder"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ce prix sera utilisé automatiquement pour calculer les montants d'approvisionnement.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4 text-secondary" />Facturation campagnes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Prix par tonne (FCFA / T)</Label>
              <Input type="number" min="0" value={prixTonne} onChange={e => setPrixTonne(Number(e.target.value))} placeholder="Ex: 15000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">TVA (%)</Label>
              <Input type="number" min="0" max="100" value={tvaPct} onChange={e => setTvaPct(Number(e.target.value))} placeholder="Ex: 18" className="mt-1" />
            </div>
            <Button size="sm" onClick={saveInvoiceSettings} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground w-full">
              <Save className="w-4 h-4 mr-1" />{invoiceSaved ? "Sauvegardé !" : "Sauvegarder"}
            </Button>
            <p className="text-xs text-muted-foreground">Ces valeurs seront utilisées pour générer la facture lors de la clôture d'une campagne.</p>
          </CardContent>
        </Card>

        {/* ── WhatsApp Alertes ── */}
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="w-4 h-4 text-green-600" />Alertes WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Numéro WhatsApp destinataire</Label>
              <Input
                className="mt-1"
                placeholder="Ex: 221776040340 (sans + ni espaces)"
                value={waPhone}
                onChange={e => setWaPhone(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Clé API CallMeBot</Label>
              <Input
                className="mt-1"
                type="password"
                placeholder="Votre clé API CallMeBot"
                value={waApiKey}
                onChange={e => setWaApiKey(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pour obtenir une clé gratuite : envoyez <strong>"I allow callmebot to send me messages"</strong> au{" "}
              <a href="https://wa.me/34644373777" target="_blank" rel="noreferrer" className="underline text-green-700">+34 644 37 37 77</a> sur WhatsApp.
              <br />Les alertes documents sont envoyées automatiquement chaque matin à 8h.
            </p>
            <Button size="sm" onClick={saveWaSettings} className="bg-green-600 hover:bg-green-700 text-white w-full">
              <Save className="w-4 h-4 mr-1" />{waSaved ? "Sauvegardé !" : "Sauvegarder"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Settings className="w-4 h-4" />Seuils d'alerte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Km avant vidange (alerte)</Label><Input type="number" defaultValue={500} className="mt-1" /></div>
            <div><Label className="text-xs">Jours avant expiration assurance</Label><Input type="number" defaultValue={30} className="mt-1" /></div>
            <div><Label className="text-xs">Jours avant expiration visite technique</Label><Input type="number" defaultValue={30} className="mt-1" /></div>
            <div><Label className="text-xs">Jours avant expiration permis</Label><Input type="number" defaultValue={60} className="mt-1" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Download className="w-4 h-4" />Données</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={exportJSON} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" /> {exporting ? "Export en cours..." : "Exporter toutes les données (JSON)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}