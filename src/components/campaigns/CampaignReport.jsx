import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Truck, RotateCw, Package, MapPin, Calendar, CheckCircle2, AlertTriangle, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export default function CampaignReport({ campaign, client, rotations, declarations, vehicles, drivers, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`
      <html><head>
        <title>Rapport — ${campaign.nom_campagne}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; padding: 24px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 13px; font-weight: 700; margin: 18px 0 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
          h3 { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
          .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
          .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 12px; }
          .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi .val { font-size: 22px; font-weight: 800; color: #1e3a5f; }
          .kpi .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
          .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #6b7280; }
          .info-val { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
          th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f9fafb; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
          .badge-ok { background: #d1fae5; color: #065f46; }
          .badge-warn { background: #fef3c7; color: #92400e; }
          .badge-end { background: #f3f4f6; color: #374151; }
          .progress { height: 8px; background: #e5e7eb; border-radius: 4px; margin-top: 4px; }
          .progress-bar { height: 8px; background: #f97316; border-radius: 4px; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
          .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 12px; color: #b91c1c; font-size: 11px; margin-bottom: 10px; }
          .success { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; color: #065f46; font-size: 11px; margin-bottom: 10px; }
        </style>
      </head><body>${content}
      <div class="footer">Document généré le ${new Date().toLocaleDateString("fr-FR")} · Sierra Logistics</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  // Stats
  const totalRotations = rotations.length;
  const bonsPhysiques = rotations.filter(r => r.bon_physique_recu).length;
  const ecart = totalRotations - bonsPhysiques;
  const tonnageRealise = campaign.tonnage_realise || 0;
  const tonnagePrevu = campaign.tonnage_total_prevu || 0;
  const progressTonnage = tonnagePrevu > 0 ? Math.min(100, Math.round(tonnageRealise / tonnagePrevu * 100)) : 0;
  const progressRot = campaign.nombre_rotations_prevues > 0 ? Math.min(100, Math.round((campaign.nombre_rotations_realisees || 0) / campaign.nombre_rotations_prevues * 100)) : 0;

  // Vehicles used
  const vehicleIds = [...new Set(rotations.map(r => r.vehicle_id))];
  const vehiclesUsed = vehicleIds.map(vid => {
    const v = vehicles.find(x => x.id === vid);
    const rots = rotations.filter(r => r.vehicle_id === vid);
    const poids = rots.reduce((s, r) => s + (Number(r.poids_charge_tonnes) || 0), 0);
    return { vehicle: v, rotations: rots.length, poids };
  }).filter(x => x.vehicle);

  // Drivers used
  const driverIds = [...new Set(rotations.map(r => r.driver_id).filter(Boolean))];
  const driversUsed = driverIds.map(did => {
    const d = drivers.find(x => x.id === did);
    const rots = rotations.filter(r => r.driver_id === did);
    return { driver: d, rotations: rots.length };
  }).filter(x => x.driver);

  const duration = campaign.date_debut && campaign.date_fin_prevue
    ? Math.ceil((new Date(campaign.date_fin_prevue) - new Date(campaign.date_debut)) / 86400000)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl my-6">
        {/* Action bar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">Rapport de clôture — {campaign.nom_campagne}</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Printer className="w-4 h-4 mr-2" /> Imprimer / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Report content */}
        <div className="p-6 space-y-6" ref={printRef}>
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold text-foreground">{campaign.nom_campagne}</h1>
              <Badge className="bg-muted text-muted-foreground text-[10px]">Clôturée</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {client?.nom || "—"} · {campaign.type_marchandise}{campaign.bl_navire ? ` · BL: ${campaign.bl_navire}` : ""}
              {campaign.reference ? ` · Réf: ${campaign.reference}` : ""}
            </p>
          </div>

          {/* Ecart alert */}
          {ecart > 0 ? (
            <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span><strong>Écart bons détecté :</strong> {ecart} bon(s) manquant(s) — {totalRotations} bons système vs {bonsPhysiques} bons physiques.</span>
            </div>
          ) : totalRotations > 0 ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Tous les bons sont reconciliés — aucun écart détecté.</span>
            </div>
          ) : null}

          {/* KPIs */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><RotateCw className="w-4 h-4 text-primary" /> Indicateurs clés</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Rotations réalisées", value: campaign.nombre_rotations_realisees || 0, sub: `/ ${campaign.nombre_rotations_prevues || 0} prévues`, color: "text-primary" },
                { label: "Tonnage livré (T)", value: fmt(tonnageRealise), sub: `/ ${fmt(tonnagePrevu)} T prévu`, color: "text-secondary" },
                { label: "Bons système", value: totalRotations, sub: `${bonsPhysiques} physiques`, color: "text-blue-600" },
                { label: "Durée (jours)", value: duration ?? "—", sub: `${fmtDate(campaign.date_debut)} → ${fmtDate(campaign.date_fin_prevue)}`, color: "text-violet-600" },
              ].map((k, i) => (
                <div key={i} className="bg-muted/40 border border-border rounded-xl p-4 text-center">
                  <p className={cn("text-2xl font-extrabold", k.color)}>{k.value}</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{k.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Avancement tonnage", pct: progressTonnage, color: "bg-secondary" },
              { label: "Avancement rotations", pct: progressRot, color: "bg-primary" },
            ].map((p, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-bold">{p.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className={cn("h-2 rounded-full transition-all", p.color)} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Campaign info */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Informations de la campagne</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Port d'origine", value: campaign.port_origine || "—" },
                { label: "Dépôt destination", value: campaign.depot_destination || "—" },
                { label: "Date de début", value: fmtDate(campaign.date_debut) },
                { label: "Date de fin prévue", value: fmtDate(campaign.date_fin_prevue) },
                { label: "BL Navire", value: campaign.bl_navire || "—" },
                { label: "Client", value: client?.nom || "—" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
            {campaign.observations && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <strong>Observations :</strong> {campaign.observations}
              </div>
            )}
          </div>

          {/* Vehicles */}
          {vehiclesUsed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Camions mobilisés ({vehiclesUsed.length})</h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="text-left p-2.5 font-semibold text-foreground">Immatriculation</th>
                      <th className="text-left p-2.5 font-semibold text-foreground">Code</th>
                      <th className="text-left p-2.5 font-semibold text-foreground">Marque / Modèle</th>
                      <th className="text-right p-2.5 font-semibold text-foreground">Rotations</th>
                      <th className="text-right p-2.5 font-semibold text-foreground">Tonnage (T)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiclesUsed.map(({ vehicle: v, rotations: r, poids }, i) => (
                      <tr key={i} className={cn(i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                        <td className="p-2.5 font-mono font-bold">{v.immatriculation}</td>
                        <td className="p-2.5">{v.code_camion || "—"}</td>
                        <td className="p-2.5">{v.marque} {v.modele}</td>
                        <td className="p-2.5 text-right font-semibold">{r}</td>
                        <td className="p-2.5 text-right font-semibold">{fmt(poids)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drivers */}
          {driversUsed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Chauffeurs mobilisés ({driversUsed.length})</h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="text-left p-2.5 font-semibold text-foreground">Nom</th>
                      <th className="text-left p-2.5 font-semibold text-foreground">Téléphone</th>
                      <th className="text-right p-2.5 font-semibold text-foreground">Rotations effectuées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driversUsed.map(({ driver: d, rotations: r }, i) => (
                      <tr key={i} className={cn(i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                        <td className="p-2.5 font-semibold">{d.prenom} {d.nom}</td>
                        <td className="p-2.5 text-muted-foreground">{d.telephone || "—"}</td>
                        <td className="p-2.5 text-right font-semibold">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Declarations summary */}
          {declarations.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Fiches journalières ({declarations.length})</h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="text-left p-2.5 font-semibold text-foreground">Date</th>
                      <th className="text-right p-2.5 font-semibold text-foreground">Rotations</th>
                      <th className="text-right p-2.5 font-semibold text-foreground">Tonnage (T)</th>
                      <th className="text-right p-2.5 font-semibold text-foreground">Écart bons</th>
                      <th className="text-left p-2.5 font-semibold text-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declarations.slice(0, 20).map((d, i) => (
                      <tr key={i} className={cn(i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                        <td className="p-2.5">{fmtDate(d.date_declaration)}</td>
                        <td className="p-2.5 text-right">{d.nombre_rotations_jour || 0}</td>
                        <td className="p-2.5 text-right">{fmt(d.tonnage_total_jour)}</td>
                        <td className={cn("p-2.5 text-right font-semibold", (d.ecart_bons || 0) > 0 ? "text-destructive" : "text-emerald-600")}>
                          {d.ecart_bons || 0}
                        </td>
                        <td className="p-2.5">
                          <Badge className={cn("text-[10px]",
                            d.statut_validation === "valide" ? "bg-emerald-500/10 text-emerald-600" :
                            d.statut_validation === "ecart_detecte" ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          )}>{d.statut_validation}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {declarations.length > 20 && <p className="text-xs text-muted-foreground p-2 text-center">+ {declarations.length - 20} fiches supplémentaires</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}