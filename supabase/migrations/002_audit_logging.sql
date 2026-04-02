-- Migration: 002_audit_logging.sql
-- Description: Sets up the Enterprise Audit Logging system to track all mutations.

-- 1. Create the Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    actor_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries by table or time
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.log_table_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
BEGIN
    -- Attempt to grab the actor_id from the Supabase JWT auth context
    BEGIN
        v_actor_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, action, actor_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_actor_id, row_to_json(OLD)::jsonb, NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, action, actor_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_actor_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, action, actor_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_actor_id, NULL, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Triggers to Core Tables
-- Spaces
DROP TRIGGER IF EXISTS audit_spaces_trigger ON public.spaces;
CREATE TRIGGER audit_spaces_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.log_table_mutation();

-- Leases
DROP TRIGGER IF EXISTS audit_leases_trigger ON public.leases;
CREATE TRIGGER audit_leases_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.leases
FOR EACH ROW EXECUTE FUNCTION public.log_table_mutation();

-- Rent Payments
DROP TRIGGER IF EXISTS audit_rent_payments_trigger ON public.rent_payments;
CREATE TRIGGER audit_rent_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.log_table_mutation();

-- Maintenance Tickets
DROP TRIGGER IF EXISTS audit_maintenance_tickets_trigger ON public.maintenance_tickets;
CREATE TRIGGER audit_maintenance_tickets_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_table_mutation();

-- Trust Scores
DROP TRIGGER IF EXISTS audit_trust_scores_trigger ON public.trust_scores;
CREATE TRIGGER audit_trust_scores_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.trust_scores
FOR EACH ROW EXECUTE FUNCTION public.log_table_mutation();

-- Secure the Audit Logs table so it can't be easily modified
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_audit_access ON public.audit_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
