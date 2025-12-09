-- Migration: create report_images table
CREATE TABLE IF NOT EXISTS public.report_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  bucket text DEFAULT 'reports',
  storage_path text NOT NULL,
  filename text,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON public.report_images (report_id);
CREATE INDEX IF NOT EXISTS idx_report_images_uploaded_by ON public.report_images (uploaded_by);
