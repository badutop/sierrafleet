import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useAppSetting, useSetAppSetting, isSettingOn } from "@/hooks/use-app-setting";
import { DRIVER_BON_ENTRY_KEY } from "@/lib/driverBonEntry";

// Bascule entre les deux variantes du cycle fiche du jour -> refuel :
// - OFF (par défaut) : comportement actuel, inchangé — Responsable des
//   Opérations saisit la fiche du jour (RotationSheetEntry.jsx),
//   Responsable Exploitation valide manuellement le refuel (Carburant >
//   Validation).
// - ON : le chauffeur scanne lui-même son bon d'enlèvement depuis son
//   espace (poids/N° de BL pré-remplis par IA), et la validation du refuel
//   à la 3e rotation se fait automatiquement. Aucun des deux flux n'est
//   supprimé — cette bascule ne fait que choisir lequel est actif, pour
//   pouvoir revenir en arrière à tout moment sans rien reconfigurer.
export default function DriverBonEntryToggleCard() {
  const { data: setting } = useAppSetting(DRIVER_BON_ENTRY_KEY);
  const setSetting = useSetAppSetting(DRIVER_BON_ENTRY_KEY);
  const active = isSettingOn(setting);

  const handleToggle = (checked) => {
    setSetting.mutate(
      { value: checked ? "true" : "false", setting },
      {
        onSuccess: () => toast.success(checked ? "Nouveau flux activé" : "Retour à l'ancien flux"),
        onError: (err) => toast.error(`Erreur : ${err.message}`),
      }
    );
  };

  return (
    <Card className="border-2 border-secondary/40 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5 text-secondary" />
          </div>
          <span className="font-bold">Saisie fiche du jour par le chauffeur</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Le chauffeur scanne son bon d'enlèvement (poids et N° de BL extraits automatiquement) et le
          refuel à la 3e rotation est validé automatiquement, au lieu d'une saisie par le Responsable des
          Opérations et d'une validation par le Responsable Exploitation.
        </p>
        <div className="flex items-center justify-between bg-muted/40 border border-border rounded-xl px-3 py-2.5">
          <span className="text-sm font-medium">{active ? "Nouveau flux actif" : "Ancien flux actif"}</span>
          <Switch checked={active} onCheckedChange={handleToggle} disabled={setSetting.isPending} />
        </div>
      </CardContent>
    </Card>
  );
}
