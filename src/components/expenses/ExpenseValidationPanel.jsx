import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ValidationPanel = ({ expense, onValidate, onReject, isPending }) => {
  const isWaiting = expense.statut === "en_attente";
  const isValidated = expense.statut === "valide";
  const isRejected = expense.statut === "rejete";

  const statusIcon = {
    en_attente: <Clock className="w-5 h-5 text-amber-500" />,
    valide: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    rejete: <XCircle className="w-5 h-5 text-red-500" />,
  }[expense.statut];

  const statusText = {
    en_attente: "En attente de validation",
    valide: "Validé",
    rejete: "Rejeté",
  }[expense.statut];

  const steps = [
    { label: "Création", done: true },
    { label: "Validation", done: isValidated || isRejected, active: isWaiting },
    { label: "Finalisé", done: isValidated },
  ];

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusIcon}
            <div>
              <CardTitle className="text-sm">{statusText}</CardTitle>
              <p className="text-xs text-muted-foreground">Dépense créée le {new Date(expense.created_date).toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
          <Badge className={cn("text-xs", expense.statut === "en_attente" && "bg-amber-500/10 text-amber-600", expense.statut === "valide" && "bg-emerald-500/10 text-emerald-600", expense.statut === "rejete" && "bg-destructive/10 text-destructive")}>
            {expense.statut === "en_attente" ? "⏳ En attente" : expense.statut === "valide" ? "✓ Validé" : "✗ Rejeté"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Process steps */}
        <div className="flex items-center justify-between text-xs">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold mb-1", step.done ? "bg-emerald-500/20 text-emerald-600" : step.active ? "bg-amber-500/20 text-amber-600 ring-2 ring-amber-300" : "bg-muted text-muted-foreground")}>
                {step.done ? "✓" : i + 1}
              </div>
              <span className={cn("text-[11px]", step.done || step.active ? "font-medium text-foreground" : "text-muted-foreground")}>{step.label}</span>
              {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-2 mt-3", step.done ? "bg-emerald-500/30" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Validation buttons - only shown for pending expenses */}
        {isWaiting && (
          <div className="flex gap-2 pt-3 border-t border-border">
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => onValidate(expense.id)} disabled={isPending}>
              <CheckCircle className="w-3 h-3 mr-1" /> Valider
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-destructive hover:bg-destructive/10" onClick={() => onReject(expense.id)} disabled={isPending}>
              <XCircle className="w-3 h-3 mr-1" /> Rejeter
            </Button>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-500/5 border border-red-500/20 rounded p-2 text-xs text-red-700">
            <AlertCircle className="w-3 h-3 inline mr-1" /> Ce frais a été rejeté et nécessite une révision.
          </div>
        )}

        {isValidated && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2 text-xs text-emerald-700">
            <CheckCircle className="w-3 h-3 inline mr-1" /> Ce frais a été validé avec succès.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValidationPanel;