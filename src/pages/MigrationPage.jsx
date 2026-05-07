import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Database, AlertTriangle, Play } from "lucide-react";

const ENTITIES = [
  "Vehicle", "Driver", "Client", "Depot", "Supplier",
  "FuelEntry", "Maintenance", "Expense", "SparePart",
  "Campaign", "Rotation", "DailyDeclaration", "TripLog"
];

const SQL_SCRIPT = `-- À exécuter dans Supabase SQL Editor AVANT la migration
-- Convertit les colonnes id en TEXT pour accepter les IDs Base44

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'vehicles','drivers','clients','depots','suppliers',
    'fuel_entries','maintenance','expenses','spare_parts',
    'campaigns','rotations','daily_declarations','trip_logs'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE TEXT', t);
  END LOOP;
END $$;`;

export default function MigrationPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleMigrate = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    const res = await base44.functions.invoke("migrateToSupabase", { entities: ENTITIES });
    setRunning(false);
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setResults(res.data);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Migration vers Supabase</h1>
          <p className="text-muted-foreground text-sm">Exporte toutes les données Base44 vers Supabase</p>
        </div>
      </div>

      {/* Étape 1 : SQL préparatoire */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            Étape 1 — Préparer Supabase (à faire une seule fois)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-amber-700">
            Les IDs Base44 ne sont pas des UUID standard. Exécutez ce script SQL dans votre <strong>Supabase SQL Editor</strong> pour convertir les colonnes <code>id</code> en TEXT :
          </p>
          <pre className="bg-amber-100 border border-amber-200 rounded-lg p-3 text-xs overflow-x-auto text-amber-900 whitespace-pre-wrap">
            {SQL_SCRIPT}
          </pre>
          <Button variant="outline" size="sm" onClick={copySQL} className="border-amber-400 text-amber-800 hover:bg-amber-100">
            {sqlCopied ? "✓ Copié !" : "Copier le SQL"}
          </Button>
        </CardContent>
      </Card>

      {/* Étape 2 : Migration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Play className="w-4 h-4" />
            Étape 2 — Lancer la migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ENTITIES.map(e => (
              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {ENTITIES.length} entités seront migrées. Les enregistrements existants dans Supabase seront mis à jour (upsert).
          </p>
          <Button
            onClick={handleMigrate}
            disabled={running}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {running ? "Migration en cours..." : "Lancer la migration complète"}
          </Button>
        </CardContent>
      </Card>

      {/* Erreur globale */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Résultats */}
      {results && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {results.success
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              Résultats — {results.summary?.totalInserted}/{results.summary?.totalRecords} enregistrements migrés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.results?.map((r) => (
                <div key={r.entity} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {r.errors?.length > 0
                      ? <XCircle className="w-4 h-4 text-destructive" />
                      : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    <span className="text-sm font-medium">{r.entity}</span>
                    <span className="text-xs text-muted-foreground">→ {r.table}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{r.inserted}/{r.total}</span>
                    {r.errors?.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {r.errors.length} erreur(s)
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {results.results?.some(r => r.errors?.length > 0) && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-destructive">Détails des erreurs :</p>
                {results.results.filter(r => r.errors?.length > 0).map(r => (
                  <div key={r.entity} className="bg-destructive/5 rounded p-2">
                    <p className="text-xs font-medium">{r.entity}</p>
                    {r.errors.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground mt-1 break-all">{e}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}