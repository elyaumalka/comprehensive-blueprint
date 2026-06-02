CREATE POLICY "Admin read supplier docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'supplier-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin upload supplier docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'supplier-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin update supplier docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'supplier-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete supplier docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'supplier-documents' AND has_role(auth.uid(), 'admin'::app_role));