-- 1) Add paid tracking to expenses for open balance per supplier
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true;

-- 2) Supplier documents table
CREATE TABLE public.supplier_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_documents TO authenticated;
GRANT ALL ON public.supplier_documents TO service_role;

ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all supplier documents"
ON public.supplier_documents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_supplier_documents_supplier ON public.supplier_documents(supplier_id);
CREATE INDEX idx_expenses_supplier ON public.expenses(supplier_id);