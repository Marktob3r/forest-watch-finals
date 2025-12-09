-- Migration: create reports table
-- Adds a `reports` table to store user-submitted incident reports

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  location text NOT NULL,
  latitude double precision,
  longitude double precision,
  description text NOT NULL,
  severity text,
  images jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'submitted',
  created_at timestamptz DEFAULT now()
);

-- Index on created_at for recent queries
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);
