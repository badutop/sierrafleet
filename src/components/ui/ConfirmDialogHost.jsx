import React, { useState, useEffect, useCallback } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { setConfirmHandler } from "@/lib/confirm";

export default function ConfirmDialogHost() {
  const [state, setState] = useState(null);

  const handleConfirm = useCallback((message) => {
    return new Promise((resolve) => setState({ message, resolve }));
  }, []);

  useEffect(() => {
    setConfirmHandler(handleConfirm);
    return () => setConfirmHandler(null);
  }, [handleConfirm]);

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <AlertDialog open={!!state} onOpenChange={(open) => { if (!open) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmation</AlertDialogTitle>
          <AlertDialogDescription>{state?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}