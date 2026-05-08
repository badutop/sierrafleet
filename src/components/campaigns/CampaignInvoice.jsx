import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

const LOGO_URL = "https://media.base44.com/images/public/69f9299ed58f49c27c655c94/f179a6017_sierra-logistics-logo-ptit.png";
const SIERRA_NAVY = "#1e3a5f";
const SIERRA_ORANGE = "#f97316";

const fmt = (n, d = 0) => Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export const INVOICE_PRICE_KEY = "sierra_prix_tonne";
export const INVOICE_TVA_KEY = "sierra_tva_pct";

export function getPrixTonne() { return Number(localStorage.getItem(INVOICE_PRICE_KEY) || 0); }
export function getTvaPct() { return Number(localStorage.getItem(INVOICE_TVA_KEY) || 18); }

export default function CampaignInvoice({ campaign, client, rotations, onClose }) {
  const printRef = useRef();

  const prixTonne = getPrixTonne();
  const tvaPct = getTvaPct();

  // Chaque rotation a poids_charge_tonnes en tonnes directement
  const rotationsDone = rotations.filter(r => r.statut !== "annulee");
  const tonnageTotal = rotationsDone.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);

  const montantHT = tonnageTotal * prixTonne;
  const montantTVA = montantHT * (tvaPct / 100);
  const montantTTC = montantHT + montantTVA;

  const invoiceNum = `SL-${new Date().getFullYear()}-${campaign.id?.slice(0, 6).toUpperCase()}`;
  const today = new Date().toLocaleDateString("fr-FR");

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=1000,height=800");
    w.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="UTF-8"/>
        <title>Facture — ${invoiceNum}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
          .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }

          /* HEADER */
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid ${SIERRA_NAVY}; }
          .logo-block { display: flex; align-items: center; gap: 12px; }
          .logo-img { width: 130px; object-fit: contain; }
          .company-info { font-size: 9px; color: #6b7280; line-height: 1.6; }
          .invoice-meta-block { text-align: right; }
          .invoice-label { font-size: 26px; font-weight: 900; color: ${SIERRA_ORANGE}; letter-spacing: 3px; text-transform: uppercase; }
          .invoice-num { font-size: 12px; font-weight: 700; color: ${SIERRA_NAVY}; margin-top: 4px; }
          .invoice-date { font-size: 10px; color: #6b7280; margin-top: 2px; }

          /* PARTIES */
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
          .party-box { padding: 14px 16px; border-radius: 6px; }
          .party-box.emetteur { background: ${SIERRA_NAVY}; color: white; }
          .party-box.client { background: #f9fafb; border: 1px solid #e5e7eb; }
          .party-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; margin-bottom: 6px; }
          .party-box.client .party-label { color: #9ca3af; }
          .party-name { font-size: 14px; font-weight: 800; margin-bottom: 3px; }
          .party-box.emetteur .party-name { color: ${SIERRA_ORANGE}; }
          .party-box.client .party-name { color: ${SIERRA_NAVY}; }
          .party-detail { font-size: 10px; opacity: 0.8; line-height: 1.5; }
          .party-box.client .party-detail { color: #6b7280; }

          /* REF CAMPAGNE */
          .ref-box { background: #eff6ff; border-left: 4px solid ${SIERRA_NAVY}; border-radius: 0 6px 6px 0; padding: 10px 14px; margin-bottom: 20px; font-size: 10px; color: #374151; }
          .ref-box strong { color: ${SIERRA_NAVY}; }

          /* TABLE ROTATIONS */
          .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${SIERRA_NAVY}; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid ${SIERRA_ORANGE}; display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
          thead tr { background: ${SIERRA_NAVY}; color: white; }
          thead th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
          thead th:last-child, thead th:nth-last-child(2), thead th:nth-last-child(3) { text-align: right; }
          tbody tr:nth-child(even) { background: #f9fafb; }
          tbody tr:hover { background: #eff6ff; }
          tbody td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; color: #374151; }
          tbody td:last-child, tbody td:nth-last-child(2), tbody td:nth-last-child(3) { text-align: right; }
          tbody td:last-child { font-weight: 700; color: ${SIERRA_NAVY}; }
          .tfoot-row td { background: #e8f0fd; font-weight: 700; color: ${SIERRA_NAVY}; padding: 8px 10px; border-top: 2px solid ${SIERRA_NAVY}; font-size: 11px; }

          /* TOTALS */
          .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 24px; }
          .totals-box { width: 300px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .total-row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
          .total-row:last-child { border-bottom: none; }
          .total-row.ht { color: #374151; }
          .total-row.tva { color: #6b7280; background: #f9fafb; }
          .total-row.ttc { background: ${SIERRA_NAVY}; color: white; font-size: 14px; font-weight: 900; border-top: none; }
          .total-row.ttc .label { opacity: 0.85; }
          .total-row.ttc .value { color: ${SIERRA_ORANGE}; }

          /* SIGNATURES */
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
          .sig-box { border: 1.5px dashed #d1d5db; border-radius: 8px; padding: 16px; text-align: center; height: 90px; display: flex; flex-direction: column; justify-content: space-between; }
          .sig-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
          .sig-line { border-bottom: 1px solid #e5e7eb; margin: 0 16px; }

          /* FOOTER */
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
          .footer-logo { font-size: 12px; font-weight: 800; color: ${SIERRA_NAVY}; }
          .footer-logo span { color: ${SIERRA_ORANGE}; }
          .footer-info { font-size: 9px; color: #9ca3af; text-align: right; }

          @media print { body { margin: 0; } .page { padding: 20px 24px; } }
        </style>
      </head><body><div class="page">${content}</div></body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 600);
  };

  if (prixTonne === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold text-lg">Prix à la tonne non configuré</h2>
          <p className="text-sm text-muted-foreground">Veuillez d'abord définir le prix par tonne dans les <strong>Paramètres</strong>.</p>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden">
        {/* Action bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: SIERRA_NAVY }}>
          <h2 className="font-bold text-white text-lg">Facture — {invoiceNum}</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} style={{ background: SIERRA_ORANGE, color: "white" }} className="hover:opacity-90">
              <Printer className="w-4 h-4 mr-2" /> Imprimer / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="p-8" ref={printRef}>

          {/* HEADER */}
          <div className="header flex justify-between items-start mb-7 pb-5" style={{ borderBottom: `3px solid ${SIERRA_NAVY}` }}>
            <div className="logo-block flex items-center gap-3">
              <img src={LOGO_URL} alt="Sierra Logistics" className="logo-img" style={{ width: 140, objectFit: "contain" }} />
            </div>
            <div className="text-right">
              <div className="invoice-label" style={{ fontSize: 26, fontWeight: 900, color: SIERRA_ORANGE, letterSpacing: 3, textTransform: "uppercase" }}>FACTURE</div>
              <div className="invoice-num mt-1 font-bold" style={{ color: SIERRA_NAVY }}>N° {invoiceNum}</div>
              <div className="invoice-date text-xs text-gray-500 mt-0.5">Date : {today}</div>
              <div className="invoice-date text-xs text-gray-500">Échéance : {fmtDate(new Date(Date.now() + 30 * 86400000))}</div>
            </div>
          </div>

          {/* PARTIES */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg p-4" style={{ background: SIERRA_NAVY, color: "white" }}>
              <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Émetteur</div>
              <div className="font-extrabold text-base mb-1" style={{ color: SIERRA_ORANGE }}>Sierra Logistics</div>
              <div className="text-xs opacity-75 leading-relaxed">
                Transport & Logistique<br />
                Dakar, Sénégal
              </div>
            </div>
            <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Client</div>
              <div className="font-extrabold text-base mb-1" style={{ color: SIERRA_NAVY }}>{client?.nom || "—"}</div>
              {client?.contact_nom && <div className="text-xs text-gray-500 leading-relaxed">{client.contact_nom}</div>}
              {client?.contact_telephone && <div className="text-xs text-gray-500">{client.contact_telephone}</div>}
              {client?.zone && <div className="text-xs text-gray-400 mt-1">Zone : {client.zone}</div>}
            </div>
          </div>

          {/* REF CAMPAGNE */}
          <div className="rounded-r-lg p-3 mb-6 text-sm" style={{ background: "#eff6ff", borderLeft: `4px solid ${SIERRA_NAVY}` }}>
            <span className="text-gray-500">Campagne : </span><span className="font-bold" style={{ color: SIERRA_NAVY }}>{campaign.nom_campagne}</span>
            {campaign.type_marchandise && <><span className="text-gray-400 mx-3">|</span><span className="text-gray-500">Marchandise : </span><span className="font-bold">{campaign.type_marchandise}</span></>}
            <div className="mt-1 text-xs text-gray-500">
              Période : <span className="font-semibold text-gray-700">{fmtDate(campaign.date_debut)} → {fmtDate(campaign.date_fin_prevue)}</span>
              <span className="ml-4">Rotations réalisées : </span><span className="font-bold" style={{ color: SIERRA_NAVY }}>{rotationsDone.length}</span>
            </div>
          </div>

          {/* TABLE ROTATIONS */}
          <div className="mb-6">
            <div className="text-xs font-extrabold uppercase tracking-widest mb-3 pb-1 inline-block" style={{ color: SIERRA_NAVY, borderBottom: `2px solid ${SIERRA_ORANGE}` }}>
              Détail des rotations
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: SIERRA_NAVY, color: "white" }}>
                    <th className="p-2 text-left font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>#</th>
                    <th className="p-2 text-left font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>Date</th>
                    <th className="p-2 text-left font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>N° Bon Client</th>
                    <th className="p-2 text-right font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>Poids (T)</th>
                    <th className="p-2 text-right font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>Prix/T (FCFA)</th>
                    <th className="p-2 text-right font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  {rotationsDone.map((r, i) => {
                    const poids = Number(r.poids_charge_tonnes) || 0;
                    const montant = poids * prixTonne;
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                        <td className="p-2 text-gray-400">{r.numero_rotation || (i + 1)}</td>
                        <td className="p-2 text-gray-600">{fmtDateTime(r.date_rotation)}</td>
                        <td className="p-2 text-gray-600">{r.numero_bon_client || <span className="italic text-gray-300">—</span>}</td>
                        <td className="p-2 text-right font-semibold" style={{ color: SIERRA_NAVY }}>{fmt(poids, 3)}</td>
                        <td className="p-2 text-right text-gray-500">{fmt(prixTonne)}</td>
                        <td className="p-2 text-right font-bold" style={{ color: SIERRA_NAVY }}>{fmt(montant)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#e8f0fd" }}>
                    <td colSpan={3} className="p-2 font-bold" style={{ color: SIERRA_NAVY, borderTop: `2px solid ${SIERRA_NAVY}` }}>
                      TOTAL — {rotationsDone.length} rotation{rotationsDone.length > 1 ? "s" : ""}
                    </td>
                    <td className="p-2 text-right font-extrabold" style={{ color: SIERRA_NAVY, borderTop: `2px solid ${SIERRA_NAVY}` }}>{fmt(tonnageTotal, 3)} T</td>
                    <td className="p-2" style={{ borderTop: `2px solid ${SIERRA_NAVY}` }}></td>
                    <td className="p-2 text-right font-extrabold" style={{ color: SIERRA_NAVY, borderTop: `2px solid ${SIERRA_NAVY}` }}>{fmt(montantHT)} FCFA</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* TOTAUX */}
          <div className="flex justify-end mb-8">
            <div className="w-80 rounded-xl overflow-hidden border border-gray-200">
              <div className="flex justify-between px-4 py-3 text-sm border-b border-gray-100">
                <span className="text-gray-500">Montant HT</span>
                <span className="font-semibold text-gray-800">{fmt(montantHT)} FCFA</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm border-b border-gray-100 bg-gray-50">
                <span className="text-gray-400">TVA ({tvaPct}%)</span>
                <span className="font-semibold text-gray-600">{fmt(montantTVA)} FCFA</span>
              </div>
              <div className="flex justify-between px-4 py-3" style={{ background: SIERRA_NAVY }}>
                <span className="font-extrabold text-white text-base opacity-90">TOTAL TTC</span>
                <span className="font-extrabold text-base" style={{ color: SIERRA_ORANGE }}>{fmt(montantTTC)} FCFA</span>
              </div>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center" style={{ height: 90 }}>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-2">Signature & Cachet</div>
              <div className="text-xs text-gray-400 font-semibold" style={{ color: SIERRA_NAVY }}>Sierra Logistics</div>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center" style={{ height: 90 }}>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-2">Signature & Cachet</div>
              <div className="text-xs font-semibold text-gray-400">{client?.nom || "Client"}</div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
            <div className="font-extrabold text-sm" style={{ color: SIERRA_NAVY }}>
              Sierra <span style={{ color: SIERRA_ORANGE }}>Logistics</span>
            </div>
            <div className="text-xs text-gray-400 text-right">
              Document généré le {today}<br />
              N° {invoiceNum}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}