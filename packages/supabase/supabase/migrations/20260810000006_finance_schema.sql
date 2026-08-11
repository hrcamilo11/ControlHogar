-- ControlHogar U3: Finance Schema

CREATE TYPE expense_split_type AS ENUM ('equal', 'percentage', 'fixed');
CREATE TYPE payment_frequency AS ENUM ('monthly', 'bimonthly', 'quarterly', 'annual');

-- Expense categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 500),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES expense_categories(id),
  paid_by UUID NOT NULL REFERENCES profiles(id),
  split_type expense_split_type NOT NULL DEFAULT 'equal',
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense splits (who owes what)
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  percentage NUMERIC(5,2),
  UNIQUE(expense_id, user_id)
);

-- Recurring payments
CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  frequency payment_frequency NOT NULL DEFAULT 'monthly',
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  category_id UUID REFERENCES expense_categories(id),
  split_type expense_split_type NOT NULL DEFAULT 'equal',
  split_config JSONB,
  notify_days_before INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment records (when a recurring payment is marked as paid)
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_payment_id UUID NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id),
  paid_by UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  UNIQUE(recurring_payment_id, period_month, period_year)
);

-- Settlements (debt payments between members)
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES profiles(id),
  to_user UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_user != to_user)
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, category_id, month, year)
);

-- Shopping list
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  quantity TEXT,
  is_bought BOOLEAN NOT NULL DEFAULT FALSE,
  bought_by UUID REFERENCES profiles(id),
  bought_at TIMESTAMPTZ,
  expense_id UUID REFERENCES expenses(id),
  added_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_home ON expenses(home_id);
CREATE INDEX idx_expenses_date ON expenses(home_id, created_at DESC);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_recurring_payments_home ON recurring_payments(home_id);
CREATE INDEX idx_settlements_home ON settlements(home_id);
CREATE INDEX idx_budgets_home ON budgets(home_id, year, month);
CREATE INDEX idx_shopping_home ON shopping_items(home_id, is_bought);

-- Updated_at triggers
CREATE TRIGGER set_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_recurring_payments_updated_at BEFORE UPDATE ON recurring_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all finance tables: members only, no guests)
CREATE POLICY "Members access categories" ON expense_categories FOR ALL
  USING (home_id IS NULL OR is_home_member(home_id, auth.uid()));

CREATE POLICY "Members view expenses" ON expenses FOR SELECT
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) != 'guest');

CREATE POLICY "Members create expenses" ON expenses FOR INSERT
  WITH CHECK (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) IN ('owner','admin','member'));

CREATE POLICY "Authorized edit expenses" ON expenses FOR UPDATE
  USING (paid_by = auth.uid() OR get_home_role(home_id, auth.uid()) IN ('owner','admin'));

CREATE POLICY "Authorized delete expenses" ON expenses FOR DELETE
  USING (paid_by = auth.uid() OR get_home_role(home_id, auth.uid()) IN ('owner','admin'));

CREATE POLICY "Members view splits" ON expense_splits FOR SELECT
  USING (EXISTS (SELECT 1 FROM expenses e WHERE e.id = expense_id AND is_home_member(e.home_id, auth.uid())));

CREATE POLICY "Members manage splits" ON expense_splits FOR ALL
  USING (EXISTS (SELECT 1 FROM expenses e WHERE e.id = expense_id AND is_home_member(e.home_id, auth.uid())));

CREATE POLICY "Members access recurring" ON recurring_payments FOR ALL
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) != 'guest');

CREATE POLICY "Members access payment records" ON payment_records FOR ALL
  USING (EXISTS (SELECT 1 FROM recurring_payments rp WHERE rp.id = recurring_payment_id AND is_home_member(rp.home_id, auth.uid())));

CREATE POLICY "Members access settlements" ON settlements FOR ALL
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) != 'guest');

CREATE POLICY "Admin access budgets" ON budgets FOR ALL
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) IN ('owner','admin'));

CREATE POLICY "Members view budgets" ON budgets FOR SELECT
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) != 'guest');

CREATE POLICY "Members access shopping" ON shopping_items FOR ALL
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) != 'guest');

-- Trigger: Log expense as activity
CREATE OR REPLACE FUNCTION handle_expense_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_entries (home_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.home_id,
    NEW.paid_by,
    'created',
    'expense',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_expense_created
  AFTER INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION handle_expense_created();

-- Seed default categories
INSERT INTO expense_categories (name, is_default) VALUES
  ('Alimentación', TRUE),
  ('Servicios', TRUE),
  ('Arriendo/Hipoteca', TRUE),
  ('Transporte', TRUE),
  ('Entretenimiento', TRUE),
  ('Salud', TRUE),
  ('Educación', TRUE),
  ('Hogar', TRUE),
  ('Otro', TRUE);
