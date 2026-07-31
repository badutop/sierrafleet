import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ExternalLink } from "lucide-react";

// Raccourci admin vers l'espace autonome du Collecteur de bons
// (CollecteurBonsPage.jsx, route /collecte-bons — sans menu latéral, comme
// /refuel pour les chauffeurs). Ouvert dans un nouvel onglet pour ne pas
// quitter Paramètres.
export default function CollecteBonsAccessCard() {
  return (
    <Card className="border-2 border-green-500/40 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5 text-green-600" />
          </div>
          <span className="font-bold">Collecteur de bons</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Espace dédié à la collecte et à la vérification des bons finaux livrés par le client.
        </p>
        <Button asChild className="w-full h-10 rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white">
          <Link to="/collecte-bons" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir l'espace
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
