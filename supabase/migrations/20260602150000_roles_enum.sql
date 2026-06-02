-- ============================================================
-- תפקידים נוספים: הנהלת חשבונות ושיווק
-- חובה להריץ לפני קובץ ההרשאות (enum חייב להתקבע לפני שימוש)
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accounting';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
