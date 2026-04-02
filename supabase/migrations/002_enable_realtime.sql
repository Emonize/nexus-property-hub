-- ═══════════════════════════════════════════════════════════════
-- NEXUS PROPERTY HUB — Migration 002
-- AG-002: Enable Real-Time on Action Queue tables
-- ═══════════════════════════════════════════════════════════════

-- The `supabase_realtime` publication allows Supabase to send websocket
-- events for changes on the included tables.

-- We enable it for maintenance_tickets and rent_payments to allow
-- the Dashboard action queue and respective modules to update instantly.

-- Note: We only need to add them to the existing publication.
-- Check if the publication exists (Supabase creates it by default).

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rent_payments;
