-- ============================================================
-- ניהול יעדים עסקיים
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type text NOT NULL,           -- monthly_sales | employee_sales | whatsapp | collection_sales | source_sales
  period_year integer NOT NULL,
  period_month integer,              -- NULL = יעד שנתי
  target numeric(12,2) NOT NULL DEFAULT 0,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  ref_key text,                      -- שם קולקציה / שם מקור פרסום
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_goals TO authenticated;
GRANT ALL ON public.business_goals TO service_role;

ALTER TABLE public.business_goals ENABLE ROW LEVEL SECURITY;

-- כל המשתמשים המחוברים יכולים לקרוא יעדים (להצגה בדשבורד); רק מנהלת מנהלת אותם
CREATE POLICY "Auth read goals" ON public.business_goals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage goals" ON public.business_goals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update goals" ON public.business_goals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete goals" ON public.business_goals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_goals_period ON public.business_goals(period_year, period_month);

CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.business_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
