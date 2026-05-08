import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Share2, Download } from "lucide-react";
import { jsPDF } from "jspdf";

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
  const [sharing, setSharing] = useState(false);
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

  // Génère un PDF et retourne un Blob
  const generatePdfBlob = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    const lineH = 14;
    const colW = (pageW - margin * 2) / 6;

    // En-tête bleu
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 70, "F");

    // Logo texte
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Sierra Logistics", margin, 30);
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text("Transport & Logistique · Dakar, Sénégal", margin, 42);

    // FACTURE (droite)
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", pageW - margin, 28, { align: "right" });
    doc.setFontSize(9);
    doc.setTextColor(200, 220, 255);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${invoiceNum}`, pageW - margin, 42, { align: "right" });
    doc.text(`Date : ${today}   Échéance : ${echeance}`, pageW - margin, 54, { align: "right" });

    y = 90;

    // Parties
    doc.setFillColor(30, 58, 95);
    doc.roundedRect(margin, y, (pageW - margin * 2) / 2 - 6, 56, 4, 4, "F");
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Sierra Logistics", margin + 10, y + 20);
    doc.setFontSize(8);
    doc.setTextColor(200, 220, 255);
    doc.setFont("helvetica", "normal");
    doc.text("Transport & Logistique", margin + 10, y + 32);
    doc.text("Dakar, Sénégal", margin + 10, y + 43);

    const cx = margin + (pageW - margin * 2) / 2 + 6;
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(cx, y, (pageW - margin * 2) / 2 - 6, 56, 4, 4, "FD");
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(client?.nom || "—", cx + 10, y + 20);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    if (client?.contact_nom) doc.text(client.contact_nom, cx + 10, y + 32);
    if (client?.contact_telephone) doc.text(client.contact_telephone, cx + 10, y + 43);

    y += 70;

    // Ref campagne
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(30, 58, 95);
    doc.rect(margin, y, pageW - margin * 2, 26, "F");
    doc.setLineWidth(3);
    doc.setDrawColor(30, 58, 95);
    doc.line(margin, y, margin, y + 26);
    doc.setLineWidth(0.5);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Campagne : `, margin + 6, y + 11);
    doc.setFont("helvetica", "normal");
    doc.text(campaign.nom_campagne, margin + 52, y + 11);
    doc.setFont("helvetica", "bold");
    doc.text(`Période : `, margin + 6, y + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtDate(campaign.date_debut)} → ${fmtDate(campaign.date_fin_prevue)}    |    Rotations : ${rotationsDone.length}`, margin + 40, y + 20);

    y += 36;

    // Section title
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DÉTAIL DES ROTATIONS", margin, y + 8);
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(1.5);
    doc.line(margin, y + 10, margin + 120, y + 10);
    doc.setLineWidth(0.5);

    y += 18;

    // Table header
    const cols = [30, 55, 85, 55, 60, 65]; // widths
    const colX = [margin];
    for (let i = 1; i < cols.length; i++) colX.push(colX[i - 1] + cols[i - 1]);

    doc.setFillColor(30, 58, 95);
    doc.rect(margin, y, pageW - margin * 2, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const headers = ["#", "Date", "N° Bon Client", "Poids (T)", "Prix/T", "Montant HT"];
    headers.forEach((h, i) => {
      const align = i >= 3 ? "right" : "left";
      const x = align === "right" ? colX[i] + cols[i] - 4 : colX[i] + 4;
      doc.text(h, x, y + 10, { align });
    });
    y += 16;

    // Table rows
    doc.setFont("helvetica", "normal");
    rotationsDone.forEach((r, i) => {
      const poids = Number(r.poids_charge_tonnes) || 0;
      const montant = poids * prixTonne;
      if (i % 2 === 1) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageW - margin * 2, lineH, "F"); }
      doc.setTextColor(i % 2 === 0 ? 55 : 55, 65, 81);
      doc.setFontSize(7.5);
      const row = [
        String(r.numero_rotation || (i + 1)),
        fmtDate(r.date_rotation),
        r.numero_bon_client || "—",
        fmt(poids, 3),
        fmt(prixTonne),
        `${fmt(montant)} FCFA`,
      ];
      row.forEach((val, j) => {
        const align = j >= 3 ? "right" : "left";
        const x = align === "right" ? colX[j] + cols[j] - 4 : colX[j] + 4;
        doc.text(val, x, y + 9, { align });
      });
      y += lineH;
      if (y > pageH - 100) { doc.addPage(); y = 40; }
    });

    // Tfoot
    doc.setFillColor(232, 240, 253);
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(1.2);
    doc.line(margin, y, pageW - margin, y);
    doc.rect(margin, y, pageW - margin * 2, lineH + 2, "F");
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`TOTAL — ${rotationsDone.length} rotation${rotationsDone.length > 1 ? "s" : ""}`, margin + 4, y + 9);
    doc.text(`${fmt(tonnageTotal, 3)} T`, colX[3] + cols[3] - 4, y + 9, { align: "right" });
    doc.text(`${fmt(montantHT)} FCFA`, colX[5] + cols[5] - 4, y + 9, { align: "right" });
    y += lineH + 12;

    // Totaux
    const totW = 200;
    const totX = pageW - margin - totW;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(totX, y, totW, 56, 4, 4, "FD");
    doc.setTextColor(55, 65, 81); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Montant HT", totX + 10, y + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`${fmt(montantHT)} FCFA`, totX + totW - 10, y + 14, { align: "right" });
    doc.setFillColor(249, 250, 251);
    doc.rect(totX, y + 18, totW, 16, "F");
    doc.setFont("helvetica", "normal"); doc.setTextColor(107, 114, 128);
    doc.text(`TVA (${tvaPct}%)`, totX + 10, y + 28);
    doc.setFont("helvetica", "bold");
    doc.text(`${fmt(montantTVA)} FCFA`, totX + totW - 10, y + 28, { align: "right" });
    doc.setFillColor(30, 58, 95);
    doc.roundedRect(totX, y + 34, totW, 22, 4, 4, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("TOTAL TTC", totX + 10, y + 48);
    doc.setTextColor(249, 115, 22);
    doc.text(`${fmt(montantTTC)} FCFA`, totX + totW - 10, y + 48, { align: "right" });

    y += 70;

    // Signatures
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.8);
    const sigW = (pageW - margin * 2 - 20) / 2;
    doc.setLineDash([4, 3]);
    doc.roundedRect(margin, y, sigW, 60, 4, 4);
    doc.roundedRect(margin + sigW + 20, y, sigW, 60, 4, 4);
    doc.setLineDash([]);
    doc.setTextColor(156, 163, 175); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("SIGNATURE & CACHET", margin + sigW / 2, y + 12, { align: "center" });
    doc.setTextColor(30, 58, 95); doc.setFontSize(9);
    doc.text("Sierra Logistics", margin + sigW / 2, y + 30, { align: "center" });
    doc.setTextColor(156, 163, 175); doc.setFontSize(7);
    doc.text("SIGNATURE & CACHET", margin + sigW + 20 + sigW / 2, y + 12, { align: "center" });
    doc.setTextColor(30, 58, 95); doc.setFontSize(9);
    doc.text(client?.nom || "Client", margin + sigW + 20 + sigW / 2, y + 30, { align: "center" });

    y += 72;

    // Footer
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    doc.setTextColor(30, 58, 95); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Sierra ", margin, y + 12);
    doc.setTextColor(249, 115, 22);
    doc.text("Logistics", margin + 26, y + 12);
    doc.setTextColor(156, 163, 175); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(`Document généré le ${today}  ·  N° ${invoiceNum}`, pageW - margin, y + 12, { align: "right" });

    return doc.output("blob");
  };

  const handleDownload = () => {
    const blob = generatePdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Facture-${invoiceNum}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = async () => {
    setSharing(true);
    const blob = generatePdfBlob();
    const file = new File([blob], `Facture-${invoiceNum}.pdf`, { type: "application/pdf" });

    // Web Share API (mobile/navigateurs compatibles)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Facture ${invoiceNum}`,
        text: `Facture Sierra Logistics — ${campaign.nom_campagne}\nClient : ${client?.nom || "—"}\nTotal TTC : ${fmt(montantTTC)} FCFA`,
      });
    } else {
      // Fallback : télécharger le PDF + ouvrir WhatsApp Web avec un message
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Facture-${invoiceNum}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      const msg = encodeURIComponent(
        `📄 *Facture Sierra Logistics*\n\n` +
        `N° ${invoiceNum}\n` +
        `Campagne : ${campaign.nom_campagne}\n` +
        `Client : ${client?.nom || "—"}\n` +
        `Rotations : ${rotationsDone.length}\n` +
        `Tonnage total : ${fmt(tonnageTotal, 3)} T\n` +
        `Montant HT : ${fmt(montantHT)} FCFA\n` +
        `TVA (${tvaPct}%) : ${fmt(montantTVA)} FCFA\n` +
        `*Total TTC : ${fmt(montantTTC)} FCFA*\n\n` +
        `_(La facture PDF a été téléchargée — veuillez la joindre à ce message)_`
      );
      const phone = client?.contact_telephone?.replace(/\D/g, "") || "";
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    }
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4">
      <div className="w-full max-w-4xl my-6 rounded-2xl overflow-hidden shadow-2xl">
        {/* Barre d'action */}
        <div className="flex items-center justify-between px-6 py-3" style={{ background: SIERRA_NAVY }}>
          <span className="font-bold text-white">Facture — {invoiceNum}</span>
          <div className="flex gap-2">
            <Button onClick={handleDownload} style={{ background: SIERRA_ORANGE, color: "white" }} className="hover:opacity-90 text-sm h-8 px-3">
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button onClick={handleShareWhatsApp} disabled={sharing} className="h-8 px-3 text-sm bg-green-600 hover:bg-green-700 text-white">
              <Share2 className="w-4 h-4 mr-1" /> {sharing ? "..." : "WhatsApp"}
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