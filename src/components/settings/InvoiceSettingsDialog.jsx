import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { getTvaPct, INVOICE_TVA_KEY } from "@/components/campaigns/CampaignInvoice";

export default function InvoiceSettingsDialog({ open, onClose }) {
  const [tvaPct, setTvaPct] = useState(() => getTvaPct());

  const handleSave = () => {
    localStorage.setItem(INVOICE_TVA_KEY, String(tvaPct));
    toast.success("Paramètres de facturation enregistrés");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            Facturation campagnes
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Le tarif par tonne se définit par client, dans la page Clients. La TVA ci-dessous s'applique à toutes les factures.
        </p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-primary flex items-center gap-1.5"><FileText className="w-4 h-4" />TVA</p>
            <div>
              <Label className="text-xs">TVA (%)</Label>
              <Input type="number" min="0" max="100" className="mt-1 bg-card" placeholder="Ex: 18" value={tvaPct} onChange={e => setTvaPct(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
