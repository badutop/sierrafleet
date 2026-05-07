import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Pencil, Trash2, AlertCircle } from "lucide-react";

export default function ExpenseValidationPanel({ expense, onValidate, onReject, onEdit, onDelete, isPending }) {
  const isRejected = expense.statut === "rejete";

  return (
    <div className="flex flex-col gap-2">
      {isRejected && (
        <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Frais rejeté — veuillez le modifier avant de le resoumettre.</span>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onEdit(expense)} disabled={isPending}>
          <Pencil className="w-3 h-3 mr-1" /> Modifier
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => onDelete(expense.id)} disabled={isPending}>
          <Trash2 className="w-3 h-3 mr-1" /> Supprimer
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => onValidate(expense.id)} disabled={isPending}>
          <CheckCircle className="w-3 h-3 mr-1" /> Valider
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => onReject(expense.id)} disabled={isPending}>
          <XCircle className="w-3 h-3 mr-1" /> Rejeter
        </Button>
      </div>
    </div>
  );
}