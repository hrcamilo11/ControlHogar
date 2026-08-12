-- Add assigned_to and estimated_date to maintenances
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS estimated_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_maintenances_assigned ON maintenances(assigned_to) WHERE assigned_to IS NOT NULL;
