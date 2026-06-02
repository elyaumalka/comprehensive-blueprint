-- ============================================================
-- הרשאות נוספות לתפקידים החדשים (additive — רק מוסיף גישה)
-- חובה להריץ אחרי קובץ ה-enum
-- ============================================================

-- הנהלת חשבונות: ניהול מלא של כספים, הוצאות, ספקים, יעדים
CREATE POLICY "Accounting all expenses" ON public.expenses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'accounting')) WITH CHECK (public.has_role(auth.uid(),'accounting'));
CREATE POLICY "Accounting all incomes" ON public.manual_incomes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'accounting')) WITH CHECK (public.has_role(auth.uid(),'accounting'));
CREATE POLICY "Accounting all suppliers" ON public.suppliers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'accounting')) WITH CHECK (public.has_role(auth.uid(),'accounting'));
CREATE POLICY "Accounting manage goals" ON public.business_goals
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'accounting')) WITH CHECK (public.has_role(auth.uid(),'accounting'));

-- שיווק: ניהול לקוחות, לידים, קמפיינים, ניוזלטרים
CREATE POLICY "Marketing insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing update customers" ON public.customers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing update leads" ON public.leads
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing all campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'marketing')) WITH CHECK (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing all newsletters" ON public.newsletters
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'marketing')) WITH CHECK (public.has_role(auth.uid(),'marketing'));
