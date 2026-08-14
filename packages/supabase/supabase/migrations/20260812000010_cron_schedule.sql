-- Enable pg_cron extension (may already be enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule check-overdue to run every day at 7:00 AM UTC (2:00 AM Colombia)
-- This calls the Edge Function via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function that invokes the Edge Function
CREATE OR REPLACE FUNCTION invoke_check_overdue()
RETURNS void AS $$
DECLARE
  response_id bigint;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-overdue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: every day at 7:00 UTC
SELECT cron.schedule(
  'check-overdue-daily',
  '0 7 * * *',
  $$SELECT invoke_check_overdue()$$
);
