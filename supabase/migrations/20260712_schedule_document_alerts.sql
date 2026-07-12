-- Planifie l'envoi quotidien des alertes documents (send-document-alerts)
-- à 8h heure de Dakar (UTC+0, pas d'heure d'été) via pg_cron + pg_net.
--
-- Le secret partagé (x-cron-secret) est stocké dans Supabase Vault plutôt
-- qu'en clair ici, ce fichier finissant dans un repo public sur GitHub.
-- Remplace <CRON_SECRET_VALUE> par la vraie valeur avant d'exécuter — ne
-- commite jamais la vraie valeur.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select vault.create_secret('<CRON_SECRET_VALUE>', 'cron_secret_send_document_alerts');

select cron.schedule(
  'send-document-alerts-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://fubwunwcwhtlrkftzbsp.supabase.co/functions/v1/send-document-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cron_secret_send_document_alerts'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
