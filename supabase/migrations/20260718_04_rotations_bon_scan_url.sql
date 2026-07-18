-- La confirmation d'un bon physique (CampaignRotationsTable) doit maintenant
-- s'accompagner d'un scan du bon, pas seulement d'un clic — on garde une
-- preuve (photo ou, en mode démo, une image placeholder) de chaque bon confirmé.
alter table public.rotations add column if not exists bon_physique_scan_url text;
