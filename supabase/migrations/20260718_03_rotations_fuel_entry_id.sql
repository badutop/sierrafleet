-- Lie le checkpoint refuel (3e rotation d'un groupe client+camion) au vrai
-- fuel_entries créé par le Rechargement Auto, une fois la recharge
-- effectivement réalisée (pas seulement validée dans Carburant > Validation).
-- Sans ce lien, un camion validé restait indéfiniment dans la liste "en
-- attente de rechargement" même après la recharge réelle.
alter table public.rotations add column if not exists fuel_entry_id text;
