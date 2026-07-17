-- Rattache chaque rotation (chargement camion) à un client précis, pour
-- permettre une facturation exacte par client sur les campagnes multi-clients
-- (campaign_clients). Nullable : les rotations existantes ne sont pas
-- rétroactivement attribuables avec certitude ; pour les campagnes à un seul
-- client, l'absence de client_id est traitée comme "appartient à l'unique
-- client" côté application (CampaignInvoice.jsx).
alter table public.rotations add column if not exists client_id text references public.clients(id);
