-- La fiche de résumé d'un rechargement (Carburant > Approvisionnements) doit
-- pouvoir afficher le chauffeur et l'heure exacte du rechargement, ce que
-- fuel_entries ne capturait pas jusqu'ici (seulement une date, sans heure,
-- et aucun lien vers le chauffeur).
alter table public.fuel_entries add column if not exists driver_id text;
alter table public.fuel_entries add column if not exists heure text;
