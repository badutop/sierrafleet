-- ============================================================================
-- Commandes Garage — table des demandes/commandes de pièces détachées.
-- Déclenchée depuis le module Garage (Maintenance) quand une pièce nécessaire
-- à une intervention n'est pas disponible en stock : la ligne atterrit d'abord
-- en "en_attente" (Alertes du module Commandes Garage), puis suit un cycle
-- inspiré des commandes fournisseur : en_attente -> commandee -> confirmee
-- -> recue, avec un dégagement possible vers annulee depuis les deux
-- premières étapes.
-- ============================================================================

create table if not exists public.garage_orders (
  id text primary key,
  spare_part_id text references public.spare_parts(id) on delete set null,
  designation text not null,
  categorie text,
  quantite integer not null default 1,
  vehicle_id text references public.vehicles(id) on delete set null,
  maintenance_id text references public.maintenance(id) on delete set null,
  supplier_id text references public.suppliers(id) on delete set null,
  prix_unitaire numeric,
  montant_total numeric,
  date_livraison_prevue date,
  conditions_paiement text,
  notes text,
  statut text not null default 'en_attente',
  date_commande date,
  date_confirmation date,
  date_reception date,
  created_date timestamptz not null default now()
);

alter table public.garage_orders enable row level security;

drop policy if exists "garage_orders_all_authenticated" on public.garage_orders;
create policy "garage_orders_all_authenticated" on public.garage_orders
  for all to authenticated using (true) with check (true);
