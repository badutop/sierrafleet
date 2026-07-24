import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Fuel, Save, FileText } from "lucide-react";
import { getPrixTonne, getTvaPct, INVOICE_PRICE_KEY, INVOICE_TVA_KEY } from "@/components/campaigns/CampaignInvoice";
import { toast } from "sonner";

export const FUEL_PRICE_KEY = "sierra_fuel_price_per_litre";
export function getFuelPricePerLitre() {
  return Number(localStorage.getItem(FUEL_PRICE_KEY) || 650);
}

export default function SettingsPage() {
  const [fuelPrice, setFuelPrice] = useState(() => getFuelPricePerLitre());
  const [fuelSaved, setFuelSaved] = useState(false);
  const [prixTonne, setPrixTonne] = useState(() => getPrixTonne());
  const [tvaPct, setTvaPct] = useState(() => getTvaPct());
  const [invoiceSaved, setInvoiceSaved] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-secondary" />
          Paramètres
        </h1>
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
      </div>
    </div>
  );
}