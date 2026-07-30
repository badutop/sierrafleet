import React from "react";
import { Settings } from "lucide-react";
import FuelPriceCard from "@/components/settings/FuelPriceCard";
import InvoiceSettingsCard from "@/components/settings/InvoiceSettingsCard";
import AlertThresholdsCard from "@/components/settings/AlertThresholdsCard";
import ZonesSettingsCard from "@/components/settings/ZonesSettingsCard";
import WhatsAppNotifCard from "@/components/settings/WhatsAppNotifCard";

export const FUEL_PRICE_KEY = "sierra_fuel_price_per_litre";
export function getFuelPricePerLitre() {
  return Number(localStorage.getItem(FUEL_PRICE_KEY) || 650);
}

export const ALERT_KM_VIDANGE_KEY = "sierra_alert_km_vidange";
export const ALERT_JOURS_ASSURANCE_KEY = "sierra_alert_jours_assurance";
export const ALERT_JOURS_VISITE_KEY = "sierra_alert_jours_visite";
export const ALERT_JOURS_PERMIS_KEY = "sierra_alert_jours_permis";
export function getAlertKmVidange() { return Number(localStorage.getItem(ALERT_KM_VIDANGE_KEY) || 500); }
export function getAlertJoursAssurance() { return Number(localStorage.getItem(ALERT_JOURS_ASSURANCE_KEY) || 30); }
export function getAlertJoursVisite() { return Number(localStorage.getItem(ALERT_JOURS_VISITE_KEY) || 30); }
export function getAlertJoursPermis() { return Number(localStorage.getItem(ALERT_JOURS_PERMIS_KEY) || 60); }

export default function SettingsPage() {
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
        <FuelPriceCard />
        <InvoiceSettingsCard />
        <AlertThresholdsCard />
        <ZonesSettingsCard />
        <WhatsAppNotifCard />
      </div>
    </div>
  );
}
