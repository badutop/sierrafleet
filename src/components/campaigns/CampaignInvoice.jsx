import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const LOGO_URL = "https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png";
const SIERRA_NAVY = "#1e3a5f";
const SIERRA_ORANGE = "#f97316";

const fmt = (n, d = 0) => Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export const INVOICE_PRICE_KEY = "sierra_prix_tonne";
export const INVOICE_TVA_KEY = "sierra_tva_pct";

export function getPrixTonne() { return Number(localStorage.getItem(INVOICE_PRICE_KEY) || 0); }
export function getTvaPct() { return Number(localStorage.getItem(INVOICE_TVA_KEY) || 18); }

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
  .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid ${SIERRA_NAVY}; }
  .logo-img { width: 130px; object-fit: contain; }
  .invoice-label { font-size: 26px; font-weight: 900; color: ${SIERRA_ORANGE}; letter-spacing: 3px; text-transform: uppercase; }
  .invoice-num { font-size: 12px; font-weight: 700; color: ${SIERRA_NAVY}; margin-top: 4px; }
  .invoice-date { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .party-emetteur { padding: 14px 16px; border-radius: 6px; background: ${SIERRA_NAVY}; color: white; }
  .party-client { padding: 14px 16px; border-radius: 6px; background: #f9fafb; border: 1px solid #e5e7eb; }
  .party-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .party-emetteur .party-label { opacity: 0.6; }
  .party-client .party-label { color: #9ca3af; }
  .party-name { font-size: 14px; font-weight: 800; margin-bottom: 3px; }
  .party-emetteur .party-name { color: ${SIERRA_ORANGE}; }
  .party-client .party-name { color: ${SIERRA_NAVY}; }
  .party-detail { font-size: 10px; line-height: 1.5; }
  .party-emetteur .party-detail { opacity: 0.75; }
  .party-client .party-detail { color: #6b7280; }
  .ref-box { background: #eff6ff; border-left: 4px solid ${SIERRA_NAVY}; padding: 10px 14px; margin-bottom: 20px; font-size: 10px; color: #374151; border-radius: 0 6px 6px 0; }
  .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${SIERRA_NAVY}; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid ${SIERRA_ORANGE}; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
  thead tr { background: ${SIERRA_NAVY}; color: white; }
  thead th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  .tr { text-align: right !important; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; color: #374151; }
  tfoot td { background: #e8f0fd; font-weight: 700; color: ${SIERRA_NAVY}; padding: 8px 10px; border-top: 2px solid ${SIERRA_NAVY}; }
  .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totals-box { width: 300px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .total-row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
  .total-ht { color: #374151; }
  .total-tva { color: #6b7280; background: #f9fafb; }
  .total-ttc { background: ${SIERRA_NAVY}; color: white; font-size: 14px; font-weight: 900; }
  .total-ttc-value { color: ${SIERRA_ORANGE}; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
  .sig-box { border: 1.5px dashed #d1d5db; border-radius: 8px; padding: 16px; text-align: center; height: 90px; display: flex; flex-direction: column; justify-content: space-between; }
  .sig-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
  .sig-name { font-size: 11px; font-weight: 600; color: ${SIERRA_NAVY}; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 12px; font-weight: 800; color: ${SIERRA_NAVY}; }
  .footer-orange { color: ${SIERRA_ORANGE}; }
  .footer-info { font-size: 9px; color: #9ca3af; text-align: right; }
  @media print { body { margin: 0; } .page { padding: 20px 24px; } }
`;

export default function CampaignInvoice({ campaign, client, rotations, onClose }) {
  const prixTonne = getPrixTonne();
  const tvaPct = getTvaPct();

  const rotationsDone = rotations.filter(r => r.statut !== "annulee");
  const tonnageTotal = rotationsDone.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
  const montantHT = tonnageTotal * prixTonne;
  const montantTVA = montantHT * (tvaPct / 100);
  const montantTTC = montantHT + montantTVA;
  const invoiceNum = `SL-${new Date().getFullYear()}-${campaign.id?.slice(0, 6).toUpperCase()}`;
  const today = new Date().toLocaleDateString("fr-FR");
  const echeance = fmtDate(new Date(Date.now() + 30 * 86400000));

  if (prixTonne === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold text-lg">Prix à la tonne non configuré</h2>
          <p className="text-sm text-muted-foreground">
            Veuillez d'abord définir le prix par tonne dans les <strong>Paramètres → Facturation campagnes</strong>.
            Ce paramètre n'est saisi qu'une seule fois.
          </p>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  }

  // Génère le HTML de la facture (partagé entre affichage et impression)
  const invoiceHTML = `
    <div class="header">
      <img src="${LOGO_URL}" alt="Sierra Logistics" class="logo-img" />
      <div style="text-align:right">
        <div class="invoice-label">FACTURE</div>
        <div class="invoice-num">N° ${invoiceNum}</div>
        <div class="invoice-date">Date : ${today}</div>
        <div class="invoice-date">Échéance : ${echeance}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party-emetteur">
        <div class="party-label">Émetteur</div>
        <div class="party-name">Sierra Logistics</div>
        <div class="party-detail">Transport &amp; Logistique<br/>Dakar, Sénégal</div>
      </div>
      <div class="party-client">
        <div class="party-label">Client</div>
        <div class="party-name">${client?.nom || "—"}</div>
        <div class="party-detail">
          ${client?.contact_nom ? client.contact_nom + "<br/>" : ""}
          ${client?.contact_telephone || ""}
          ${client?.zone ? "<br/>Zone : " + client.zone : ""}
        </div>
      </div>
    </div>

    <div class="ref-box">
      <strong>Campagne :</strong> ${campaign.nom_campagne}
      ${campaign.type_marchandise ? `&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Marchandise :</strong> ${campaign.type_marchandise}` : ""}
      <br/>
      <strong>Période :</strong> ${fmtDate(campaign.date_debut)} → ${fmtDate(campaign.date_fin_prevue)}
      &nbsp;&nbsp;|&nbsp;&nbsp;<strong>Rotations réalisées :</strong> ${rotationsDone.length}
    </div>

    <div class="section-title">Détail des rotations</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>N° Bon Client</th>
          <th class="tr">Poids (T)</th>
          <th class="tr">Prix/T (FCFA)</th>
          <th class="tr">Montant HT</th>
        </tr>
      </thead>
      <tbody>
        ${rotationsDone.map((r, i) => {
          const poids = Number(r.poids_charge_tonnes) || 0;
          const montant = poids * prixTonne;
          return `<tr>
            <td style="color:#9ca3af">${r.numero_rotation || (i + 1)}</td>
            <td>${fmtDate(r.date_rotation)}</td>
            <td>${r.numero_bon_client || "—"}</td>
            <td style="text-align:right;font-weight:600;color:${SIERRA_NAVY}">${fmt(poids, 3)}</td>
            <td style="text-align:right;color:#6b7280">${fmt(prixTonne)}</td>
            <td style="text-align:right;font-weight:700;color:${SIERRA_NAVY}">${fmt(montant)}</td>
          </tr>`;
        }).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">TOTAL — ${rotationsDone.length} rotation${rotationsDone.length > 1 ? "s" : ""}</td>
          <td style="text-align:right;font-weight:800">${fmt(tonnageTotal, 3)} T</td>
          <td></td>
          <td style="text-align:right;font-weight:800">${fmt(montantHT)} FCFA</td>
        </tr>
      </tfoot>
    </table>

    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="total-row total-ht"><span>Montant HT</span><span>${fmt(montantHT)} FCFA</span></div>
        <div class="total-row total-tva"><span>TVA (${tvaPct}%)</span><span>${fmt(montantTVA)} FCFA</span></div>
        <div class="total-row total-ttc"><span>TOTAL TTC</span><span class="total-ttc-value">${fmt(montantTTC)} FCFA</span></div>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-label">Signature &amp; Cachet</div>
        <div class="sig-name">Sierra Logistics</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Signature &amp; Cachet</div>
        <div class="sig-name">${client?.nom || "Client"}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-brand">Sierra <span class="footer-orange">Logistics</span></div>
      <div class="footer-info">Document généré le ${today}<br/>N° ${invoiceNum}</div>
    </div>
  `;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1000,height=800");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Facture — ${invoiceNum}</title><style>${PRINT_STYLES}</style></head><body><div class="page">${invoiceHTML}</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4">
      <div className="w-full max-w-4xl my-6 rounded-2xl overflow-hidden shadow-2xl">
        {/* Barre d'action */}
        <div className="flex items-center justify-between px-6 py-3" style={{ background: SIERRA_NAVY }}>
          <span className="font-bold text-white">Facture — {invoiceNum}</span>
          <div className="flex gap-2">
            <Button onClick={handlePrint} style={{ background: SIERRA_ORANGE, color: "white" }} className="hover:opacity-90 text-sm h-8 px-3">
              Imprimer / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Facture — rendu identique au PDF */}
        <div className="bg-white" style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#1a1a2e" }}>
          <div className="page" style={{ padding: "32px 40px" }}>
            <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
            <div dangerouslySetInnerHTML={{ __html: invoiceHTML }} />
          </div>
        </div>
      </div>
    </div>
  );
}