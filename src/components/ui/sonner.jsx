"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        // Chaque type de toast reprend les couleurs sémantiques déjà utilisées
        // partout ailleurs dans l'app (statuts, badges) — plutôt qu'un fond
        // neutre bg-background identique pour succès/erreur/avertissement,
        // peu visible et peu distinguable.
        classNames: {
          toast: "group toast group-[.toaster]:shadow-xl group-[.toaster]:border-2 group-[.toaster]:font-semibold",
          description: "group-[.toast]:opacity-90",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          default: "group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border",
          success: "group-[.toaster]:bg-emerald-600 group-[.toaster]:text-white group-[.toaster]:border-emerald-700",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive",
          warning: "group-[.toaster]:bg-amber-500 group-[.toaster]:text-amber-950 group-[.toaster]:border-amber-600",
          info: "group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-primary",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
