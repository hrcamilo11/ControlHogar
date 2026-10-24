-- Daily report cron: runs at 10 PM Colombia (3 AM UTC next day)
-- Sends "Tomorrow's activities" notifications and reassigns rotatable tasks

CREATE OR REPLACE FUNCTION invoke_daily_report()
RETURNS void AS $$
DECLARE
  response_id bigint;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: every day at 3:00 UTC (10:00 PM Colombia)
SELECT cron.schedule(
  'daily-report-nightly',
  '0 3 * * *',
  $$SELECT invoke_daily_report()$$
);
