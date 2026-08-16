-- Change cron from daily to every 15 minutes
-- This ensures users get notified soon after a task becomes overdue

-- Remove old schedule
SELECT cron.unschedule('check-overdue-daily');

-- New schedule: every 15 minutes
SELECT cron.schedule(
  'check-overdue-frequent',
  '*/15 * * * *',
  $$SELECT invoke_check_overdue()$$
);
