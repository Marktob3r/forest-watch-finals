-- Migration: create file_assets table
CREATE TABLE IF NOT EXISTS public.file_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  bucket text NOT NULL,
  storage_path text NOT NULL,
  filename text,
  content_type text,
  size_bytes bigint,
  related_table text,
  related_id uuid,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_assets_owner ON public.file_assets (owner_id);
CREATE INDEX IF NOT EXISTS idx_file_assets_bucket_path ON public.file_assets (bucket, storage_path);
