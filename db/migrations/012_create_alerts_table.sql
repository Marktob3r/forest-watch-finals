-- Migration: create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id integer REFERENCES public.monitoring_regions(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  alert_type text,
  severity text,
  message text,
  details jsonb,
  status text DEFAULT 'open',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alerts_region_status ON public.alerts (region_id, status, created_at DESC);
