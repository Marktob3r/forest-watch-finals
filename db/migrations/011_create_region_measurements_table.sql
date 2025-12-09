-- Migration: create region_measurements table (time-series)
CREATE TABLE IF NOT EXISTS public.region_measurements (
  id bigserial PRIMARY KEY,
  region_id integer REFERENCES public.monitoring_regions(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL,
  temperature numeric,
  humidity numeric,
  ndvi numeric,
  soil jsonb,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient recent queries per region
CREATE INDEX IF NOT EXISTS idx_region_measurements_region_time ON public.region_measurements (region_id, measured_at DESC);

-- If TimescaleDB is available, convert to hypertable (safe to run if extension present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    BEGIN
      PERFORM public.create_hypertable('public.region_measurements', 'measured_at', if_not_exists => TRUE);
    EXCEPTION WHEN undefined_function THEN
      -- create_hypertable might be namespaced; try alternative
      BEGIN
        PERFORM create_hypertable('public.region_measurements', 'measured_at', if_not_exists => TRUE);
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'timescaledb create_hypertable not available in this environment';
      END;
    END;
  END IF;
END$$;
