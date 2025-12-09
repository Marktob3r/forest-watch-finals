-- Migration: create monitoring_regions table
CREATE TABLE IF NOT EXISTS public.monitoring_regions (
  id serial PRIMARY KEY,
  name text NOT NULL,
  country text,
  lat numeric(10,6),
  lng numeric(10,6),
  status text,
  coverage numeric,
  boundary_json jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_regions_name ON public.monitoring_regions (name);
CREATE INDEX IF NOT EXISTS idx_monitoring_regions_lat_lng ON public.monitoring_regions (lat, lng);
