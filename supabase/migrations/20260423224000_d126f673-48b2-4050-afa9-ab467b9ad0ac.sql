
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');
CREATE TYPE public.lead_status AS ENUM ('new', 'in_progress', 'converted', 'lost');
CREATE TYPE public.order_status AS ENUM ('pending', 'in_production', 'ready', 'awaiting_pickup', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'credit', 'transfer', 'other');
CREATE TYPE public.expense_category AS ENUM ('production_current','production_next','rent','salary','marketing','branding','website','crm','processing_fees','insurance','technology','tax','loan','other');
CREATE TYPE public.movement_type AS ENUM ('purchase','sale','exchange','return','adjustment','damage','transfer');
CREATE TYPE public.task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.task_status AS ENUM ('open','in_progress','done','waiting');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- helper: any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- Trigger: auto create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT NOT EXISTS(SELECT 1 FROM public.user_roles) INTO is_first_user;
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  birth_date DATE,
  language TEXT DEFAULT 'he',
  sector TEXT,
  source TEXT,
  referrer_name TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  is_returning BOOLEAN NOT NULL DEFAULT false,
  whatsapp_group BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT,
  style_notes TEXT,
  sizes JSONB,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_name ON public.customers(full_name);

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  next_followup DATE,
  converted_customer_id UUID REFERENCES public.customers(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  field TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  internal_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  collection TEXT,
  season TEXT,
  fabric_description TEXT,
  cost_price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_price NUMERIC(10,2),
  status TEXT DEFAULT 'active',
  market TEXT DEFAULT 'both',
  main_image TEXT,
  additional_images TEXT[],
  supplier_id UUID REFERENCES public.suppliers(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCT VARIANTS ============
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT,
  color TEXT,
  barcode TEXT UNIQUE,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVENTORY MOVEMENTS ============
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  qty_before INTEGER,
  qty_change INTEGER NOT NULL,
  qty_after INTEGER,
  reason TEXT,
  reference_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ============ EMPLOYEES ============
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  position TEXT,
  hourly_rate NUMERIC(10,2),
  monthly_salary NUMERIC(10,2),
  commission_pct NUMERIC(5,2),
  is_commission_only BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TIME ENTRIES (CLOCK IN/OUT) ============
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  total_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- ============ SALES ============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number SERIAL,
  customer_id UUID REFERENCES public.customers(id),
  employee_id UUID REFERENCES public.employees(id),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_reason TEXT,
  vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  installments INTEGER DEFAULT 1,
  notes TEXT,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ============ SALE ITEMS ============
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  color TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_discount NUMERIC(10,2) DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ============ ORDERS (custom orders) ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  employee_id UUID REFERENCES public.employees(id),
  status order_status NOT NULL DEFAULT 'pending',
  delivery_date DATE,
  notes TEXT,
  total NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  payment_method payment_method,
  status_history JSONB DEFAULT '[]'::JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  size TEXT,
  color TEXT,
  qty INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  line_total NUMERIC(10,2) DEFAULT 0
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============ RETURNS ============
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id),
  customer_id UUID REFERENCES public.customers(id),
  action_type TEXT NOT NULL, -- 'return','exchange','cancel'
  reason TEXT,
  product_condition TEXT,
  returned_to_stock BOOLEAN DEFAULT true,
  refund_amount NUMERIC(10,2) DEFAULT 0,
  credit_issued NUMERIC(10,2) DEFAULT 0,
  exchanged_for TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'open',
  handled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  includes_vat BOOLEAN NOT NULL DEFAULT true,
  payment_method payment_method,
  installments INTEGER DEFAULT 1,
  receipt_received BOOLEAN DEFAULT false,
  document_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Manual income (e.g. wholesale)
CREATE TABLE public.manual_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  includes_vat BOOLEAN DEFAULT true,
  payment_method payment_method,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_incomes ENABLE ROW LEVEL SECURITY;

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'open',
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES public.customers(id),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CALENDAR EVENTS ============
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  customer_id UUID REFERENCES public.customers(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  goal TEXT,
  audience TEXT,
  internal_code TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  asset_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ NEWSLETTERS ============
CREATE TABLE public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  audience_filter TEXT, -- 'all_customers','vip','leads','custom'
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_newsletters_updated BEFORE UPDATE ON public.newsletters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS POLICIES
-- =============================================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin manages profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- user_roles (only admin manages; users can read their own)
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- helper macro: staff or admin can read/write business data; viewer read-only
-- customers
CREATE POLICY "Authenticated read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manages customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Staff updates customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Admin deletes customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- leads
CREATE POLICY "Auth read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Staff update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Admin delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- suppliers - admin only
CREATE POLICY "Admin all suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- products
CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- variants
CREATE POLICY "Auth read variants" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update variants" ON public.product_variants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Admin delete variants" ON public.product_variants FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- inventory_movements
CREATE POLICY "Auth read movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert movements" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));

-- employees - admin only
CREATE POLICY "Auth read employees basic" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update employees" ON public.employees FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete employees" ON public.employees FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- time entries - employees insert their own clock in/out, admin reads all
CREATE POLICY "Auth read time" ON public.time_entries FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
);
CREATE POLICY "Staff insert time" ON public.time_entries FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
);
CREATE POLICY "Staff update own time" ON public.time_entries FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
);

-- sales
CREATE POLICY "Auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Staff update sales" ON public.sales FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));

CREATE POLICY "Auth read sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage sale items" ON public.sale_items FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));

-- orders
CREATE POLICY "Auth read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Auth read order items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));

-- returns
CREATE POLICY "Auth read returns" ON public.returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage returns" ON public.returns FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));

-- expenses - admin only
CREATE POLICY "Admin all expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin all manual incomes" ON public.manual_incomes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tasks
CREATE POLICY "Auth read own tasks" ON public.tasks FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR assigned_to = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Staff manage tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));
CREATE POLICY "Staff update tasks" ON public.tasks FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR assigned_to = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Admin delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- calendar
CREATE POLICY "Auth read calendar" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage calendar" ON public.calendar_events FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']::app_role[]));

-- campaigns - admin
CREATE POLICY "Admin all campaigns" ON public.campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- newsletters - admin
CREATE POLICY "Admin all newsletters" ON public.newsletters FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- audit log - admin reads only, system inserts
CREATE POLICY "Admin reads audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
