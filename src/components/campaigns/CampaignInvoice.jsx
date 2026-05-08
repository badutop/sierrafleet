import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

const fmt = (n, decimals = 0) => Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export const INVOICE_PRICE_KEY = "sierra_prix_tonne";
export const INVOICE_TVA_KEY = "sierra_tva_pct";

export function getPrixTonne() { return Number(localStorage.getItem(INVOICE_PRICE_KEY) || 0); }
export function getTvaPct() { return Number(localStorage.getItem(INVOICE_TVA_KEY) || 18); }

export default function CampaignInvoice({ campaign, client, rotations, onClose }) {
  const printRef = useRef();

  // Calcul du tonnage depuis les rotations (en kg → tonnes)
  const tonnageTotalKg = rotations.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
  const tonnageTotalT = tonnageTotalKg / 1000;

  const prixTonne = getPrixTonne();
  const tvaPct = getTvaPct();

  const montantHT = tonnageTotalT * prixTonne;
  const montantTVA = montantHT * (tvaPct / 100);
  const montantTTC = montantHT + montantTVA;

  const invoiceNum = `INV-${campaign.id?.slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`
      <html><head>
        <title>Facture — ${invoiceNum}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
          .company { font-size: 22px; font-weight: 800; color: #1e3a5f; }
          .company-sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
          .invoice-title { font-size: 18px; font-weight: 700; color: #f97316; text-align: right; }
          .invoice-meta { font-size: 10px; color: #6b7280; text-align: right; margin-top: 4px; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
          .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; letter-spacing: 0.05em; }
          .party-name { font-size: 14px; font-weight: 700; color: #111827; }
          .party-detail { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          thead th { background: #1e3a5f; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
          thead th:last-child { text-align: right; }
          tbody td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
          tbody td:last-child { text-align: right; font-weight: 600; }
          tbody tr:last-child td { border-bottom: none; }
          .totals { margin-left: auto; width: 280px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
          .total-row:last-child { border-bottom: none; }
          .total-row.ht { color: #374151; }
          .total-row.tva { color: #6b7280; }
          .total-row.ttc { font-size: 16px; font-weight: 800; color: #1e3a5f; border-top: 2px solid #1e3a5f; padding-top: 8px; margin-top: 4px; }
          .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
          .stamp { margin-top: 32px; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; color: #d1d5db; font-size: 11px; height: 80px; display: flex; align-items: center; justify-content: center; }
          .ref-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 11px; color: #374151; }
          .ref-box span { font-weight: 600; color: #111827; }
        </style>
      </head><body>${content}
      <div class="footer">Sierra Logistics · Document généré le ${new Date().toLocaleDateString("fr-FR")}</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  if (prixTonne === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold text-lg">Prix à la tonne non configuré</h2>
          <p className="text-sm text-muted-foreground">Veuillez d'abord définir le prix par tonne dans les <strong>Paramètres</strong> pour générer la facture.</p>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl my-6">
        {/* Action bar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">Facture — {invoiceNum}</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Printer className="w-4 h-4 mr-2" /> Imprimer / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="p-8 space-y-6" ref={printRef}>
          {/* Header */}
          <div className="header flex justify-between items-start">
            <div>
              <div className="company text-2xl font-extrabold text-primary">Sierra Logistics</div>
              <div className="company-sub text-xs text-muted-foreground mt-1">Transport & Logistique</div>
            </div>
            <div className="text-right">
              <div className="invoice-title text-xl font-bold text-secondary">FACTURE</div>
              <div className="invoice-meta text-xs text-muted-foreground mt-1">N° {invoiceNum}</div>
              <div className="invoice-meta text-xs text-muted-foreground">Date : {fmtDate(new Date())}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="parties grid grid-cols-2 gap-8">
            <div>
              <div className="party-label text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">Émetteur</div>
              <div className="party-name font-bold text-foreground">Sierra Logistics</div>
              <div className="party-detail text-sm text-muted-foreground">Transport & Logistique</div>
            </div>
            <div>
              <div className="party-label text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">Client</div>
              <div className="party-name font-bold text-foreground">{client?.nom || "—"}</div>
              {client?.contact_nom && <div className="party-detail text-sm text-muted-foreground">{client.contact_nom}</div>}
              {client?.contact_telephone && <div className="party-detail text-sm text-muted-foreground">{client.contact_telephone}</div>}
            </div>
          </div>

          {/* Campaign ref */}
          <div className="ref-box bg-muted/30 border border-border rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Campagne : </span><span className="font-semibold">{campaign.nom_campagne}</span>
            {campaign.type_marchandise && <><span className="text-muted-foreground ml-4">Marchandise : </span><span className="font-semibold">{campaign.type_marchandise}</span></>}
            {campaign.bl_navire && <><span className="text-muted-foreground ml-4">BL : </span><span className="font-semibold">{campaign.bl_navire}</span></>}
            <div className="mt-1">
              <span className="text-muted-foreground">Période : </span>
              <span className="font-semibold">{fmtDate(campaign.date_debut)} → {fmtDate(campaign.date_fin_prevue)}</span>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="section-title text-xs font-bold uppercase text-muted-foreground tracking-wide mb-3">Détail des prestations</div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary/10">
                    <th className="text-left p-3 font-semibold text-foreground">Désignation</th>
                    <th className="text-right p-3 font-semibold text-foreground">Quantité</th>
                    <th className="text-right p-3 font-semibold text-foreground">Unité</th>
                    <th className="text-right p-3 font-semibold text-foreground">Prix unitaire</th>
                    <th className="text-right p-3 font-semibold text-foreground">Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3">Prestation de transport — {campaign.type_marchandise || "marchandises"}</td>
                    <td className="p-3 text-right font-semibold">{fmt(tonnageTotalT, 3)}</td>
                    <td className="p-3 text-right text-muted-foreground">Tonne</td>
                    <td className="p-3 text-right">{fmt(prixTonne)} FCFA</td>
                    <td className="p-3 text-right font-bold text-foreground">{fmt(montantHT)} FCFA</td>
                  </tr>
                  {/* Détail par rotation si besoin */}
                  <tr className="bg-muted/20">
                    <td colSpan={5} className="p-2 text-xs text-muted-foreground text-center">
                      {rotations.length} rotations · Tonnage total : {fmt(tonnageTotalT, 3)} T ({fmt(tonnageTotalKg)} kg)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="total-row flex justify-between py-1.5 border-b border-border text-sm">
                <span className="text-muted-foreground">Montant HT</span>
                <span className="font-semibold">{fmt(montantHT)} FCFA</span>
              </div>
              <div className="total-row flex justify-between py-1.5 border-b border-border text-sm">
                <span className="text-muted-foreground">TVA ({tvaPct}%)</span>
                <span className="font-semibold">{fmt(montantTVA)} FCFA</span>
              </div>
              <div className="total-row flex justify-between py-2 text-base font-extrabold border-t-2 border-primary text-primary">
                <span>Total TTC</span>
                <span>{fmt(montantTTC)} FCFA</span>
              </div>
            </div>
          </div>

          {/* Signature zone */}
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground text-xs h-20 flex items-center justify-center">
              Signature & Cachet Sierra Logistics
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground text-xs h-20 flex items-center justify-center">
              Signature & Cachet Client
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}