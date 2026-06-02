-- ============================================================
-- כרטיס עובד מלא: עמלת משווקת, הוצאות נוספות, שעות נוספות
-- ============================================================

-- 1) קישור לקוח -> עובדת מפנה (לחישוב עמלת משווקת)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS referred_by_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON public.customers(referred_by_employee_id);

-- 2) שעות נוספות בתוך רישום שעות
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0;

-- 3) הוצאות נוספות לעובד (שי / מתנת חג / בונוס וכו')
CREATE TABLE IF NOT EXISTS public.employee_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'gift', -- gift | holiday_gift | bonus | reimbursement | other
  description text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_expenses TO authenticated;
GRANT ALL ON public.employee_expenses TO service_role;

ALTER TABLE public.employee_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all employee expenses"
  ON public.employee_expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_employee_expenses_employee ON public.employee_expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_expenses_date ON public.employee_expenses(expense_date);
