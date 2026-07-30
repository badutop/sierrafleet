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
      <Card className="border-2 border-blue-500/40 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold">Facturation campagnes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">TVA : {getTvaPct()}%</p>
          <Button className="w-full h-10 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer la facturation
          </Button>
        </CardContent>
      </Card>

      <InvoiceSettingsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
