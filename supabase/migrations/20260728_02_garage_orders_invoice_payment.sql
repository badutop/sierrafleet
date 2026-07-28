-- ============================================================================
-- Commandes Garage — étapes facture fournisseur + paiement à échéance.
-- date_echeance = date_facture + delai_paiement_jours (calculé côté appli à
-- la réception de la facture). Le paiement effectif (statut 'payee') crée
-- une dépense réelle dans public.expenses (type_frais = 'achat_pieces'),
-- reliée ici via expense_id pour traçabilité.
-- ============================================================================

alter table public.garage_orders
  add column if not exists facture_url text,
  add column if not exists date_facture date,
  add column if not exists delai_paiement_jours integer default 30,
  add column if not exists date_echeance date,
  add column if not exists montant_facture numeric,
  add column if not exists date_paiement date,
  add column if not exists expense_id text references public.expenses(id) on delete set null;
