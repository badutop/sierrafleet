-- Le formulaire "Nouvelle campagne" (CampaignsList.jsx) a un champ "Navire *"
-- qui n'avait aucune colonne correspondante — Postgrest rejette les colonnes
-- inconnues (contrairement à l'ancien backend), ce qui bloquait silencieusement
-- toute création de campagne dès que ce champ obligatoire était rempli.
alter table public.campaigns add column if not exists navire text;
