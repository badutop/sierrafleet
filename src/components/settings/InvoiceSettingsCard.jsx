import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Settings2 } from "lucide-react";
import InvoiceSettingsDialog from "./InvoiceSettingsDialog";
import { getTvaPct } from "@/components/campaigns/CampaignInvoice";

export default function InvoiceSettingsCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="border-secondary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4 text-secondary" />Facturation campagnes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">TVA : {getTvaPct()}%</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer la facturation
          </Button>
        </CardContent>
      </Card>

      <InvoiceSettingsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
