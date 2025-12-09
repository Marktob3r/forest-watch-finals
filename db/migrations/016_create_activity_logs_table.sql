-- Migration: create activity_logs (audit events)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  object_table text,
  object_id uuid,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created ON public.activity_logs (action, created_at DESC);
