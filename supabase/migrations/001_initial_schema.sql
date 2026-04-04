-- ═══════════════════════════════════════════════════════════════
-- NEXUS PROPERTY HUB — Initial Schema Migration
-- AG-001: Full schema, indexes, RLS, functions
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. USERS TABLE (RBAC) ─────────────────────────────────────
CREATE TABLE public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'tenant'
                CHECK (role IN ('owner','manager','tenant','vendor','admin')),
  avatar_url    TEXT,
  stripe_customer_id    TEXT,
  stripe_connect_id     TEXT,
  onboarding_complete   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- ─── 2. SPACES TABLE (RECURSIVE HIERARCHY) ────────────────────
CREATE TABLE public.spaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL
                CHECK (type IN ('building','home','unit','room','garage',
                                'desk','storage','lot','other')),
  address       JSONB,
  floor_plan_url TEXT,
  area_sqft     NUMERIC(10,2),
  base_rent     NUMERIC(10,2),
  currency      TEXT DEFAULT 'usd',
  amenities     TEXT[] DEFAULT '{}',
  status        TEXT DEFAULT 'vacant'
                CHECK (status IN ('vacant','occupied','maintenance',
                                  'listed','unlisted')),
  listing_photos TEXT[] DEFAULT '{}',
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_spaces_parent ON public.spaces(parent_id);
CREATE INDEX idx_spaces_owner ON public.spaces(owner_id);
CREATE INDEX idx_spaces_type ON public.spaces(type);
CREATE INDEX idx_spaces_status ON public.spaces(status);

-- ─── 3. LEASES TABLE ──────────────────────────────────────────
CREATE TABLE public.leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        UUID NOT NULL REFERENCES public.spaces(id),
  tenant_id       UUID NOT NULL REFERENCES public.users(id),
  lease_type      TEXT DEFAULT 'fixed'
                  CHECK (lease_type IN ('fixed','month_to_month','daily','hourly')),
  start_date      DATE NOT NULL,
  end_date        DATE,
  monthly_rent    NUMERIC(10,2) NOT NULL,
  deposit         NUMERIC(10,2) DEFAULT 0,
  payment_day     INT DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 28),
  split_group_id  UUID,
  split_pct       NUMERIC(5,2) DEFAULT 100.00,
  auto_renew      BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('pending','active','expired',
                                    'terminated','draft')),
  signed_doc_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leases_space ON public.leases(space_id);
CREATE INDEX idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX idx_leases_split_group ON public.leases(split_group_id);
CREATE INDEX idx_leases_status ON public.leases(status);

-- ─── 4. RENT PAYMENTS TABLE ───────────────────────────────────
CREATE TABLE public.rent_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id          UUID NOT NULL REFERENCES public.leases(id),
  tenant_id         UUID NOT NULL REFERENCES public.users(id),
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT DEFAULT 'usd',
  due_date          DATE NOT NULL,
  paid_date         TIMESTAMPTZ,
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','paid',
                                      'failed','refunded','partial')),
  stripe_payment_id TEXT,
  stripe_transfer_id TEXT,
  payment_method    TEXT,
  late_fee          NUMERIC(10,2) DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_lease ON public.rent_payments(lease_id);
CREATE INDEX idx_payments_tenant ON public.rent_payments(tenant_id);
CREATE INDEX idx_payments_status ON public.rent_payments(status);
CREATE INDEX idx_payments_due ON public.rent_payments(due_date);

-- ─── 5. MAINTENANCE TICKETS TABLE ─────────────────────────────
CREATE TABLE public.maintenance_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        UUID NOT NULL REFERENCES public.spaces(id),
  reporter_id     UUID NOT NULL REFERENCES public.users(id),
  assigned_to     UUID REFERENCES public.users(id),
  title           TEXT NOT NULL,
  description     TEXT,
  photo_urls      TEXT[] DEFAULT '{}',
  voice_note_url  TEXT,
  ai_severity     TEXT CHECK (ai_severity IN
                  ('critical','high','medium','low','cosmetic')),
  ai_category     TEXT,
  ai_diy_suggestion TEXT,
  ai_cost_estimate NUMERIC(10,2),
  priority        INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status          TEXT DEFAULT 'open'
                  CHECK (status IN ('open','triaged','in_progress',
                                    'vendor_assigned','resolved','closed')),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tickets_space ON public.maintenance_tickets(space_id);
CREATE INDEX idx_tickets_status ON public.maintenance_tickets(status);
CREATE INDEX idx_tickets_severity ON public.maintenance_tickets(ai_severity);

-- ─── 6. TRUST SCORES TABLE ────────────────────────────────────
CREATE TABLE public.trust_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id),
  score           INT NOT NULL CHECK (score BETWEEN 0 AND 1000),
  payment_history NUMERIC(5,2) DEFAULT 0,
  bg_check_status TEXT CHECK (bg_check_status IN
                  ('pending','clear','flagged','failed')),
  bg_check_id     TEXT,
  credit_score    INT,
  eviction_count  INT DEFAULT 0,
  review_avg      NUMERIC(3,2) DEFAULT 0,
  factors         JSONB DEFAULT '{}',
  last_computed   TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_trust_user ON public.trust_scores(user_id);

-- ─── 7. NOTIFICATIONS TABLE ───────────────────────────────────
CREATE TABLE public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  type          TEXT NOT NULL CHECK (type IN (
                  'payment_reminder','maintenance_update',
                  'lease_action','trust_update','system')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  channels      TEXT[] DEFAULT '{}',
  read          BOOLEAN DEFAULT FALSE,
  snoozed_until TIMESTAMPTZ,
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- ─── 8. AUDIT LOG TABLE (AG-019) ──────────────────────────────
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.users(id),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  before_data JSONB,
  after_data  JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_time ON public.audit_logs(created_at);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Recursive CTE for full hierarchy traversal
CREATE OR REPLACE FUNCTION get_space_tree(root_id UUID)
RETURNS TABLE(id UUID, parent_id UUID, name TEXT, type TEXT, depth INT)
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE tree AS (
    SELECT s.id, s.parent_id, s.name, s.type, 0 AS depth
    FROM public.spaces s WHERE s.id = root_id
    UNION ALL
    SELECT c.id, c.parent_id, c.name, c.type, t.depth + 1
    FROM public.spaces c JOIN tree t ON c.parent_id = t.id
  )
  SELECT * FROM tree ORDER BY depth, name;
$$;

-- Trust Score computation
CREATE OR REPLACE FUNCTION compute_trust_score(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_payment_score NUMERIC;
  v_bg_score NUMERIC;
  v_credit_score NUMERIC;
  v_eviction_score NUMERIC;
  v_review_score NUMERIC;
  v_total INT;
BEGIN
  SELECT GREATEST(0, 100 - COALESCE(SUM(CASE
    WHEN status = 'paid' AND paid_date > due_date + INTERVAL '3 days'
      THEN 10
    WHEN status IN ('failed','pending') AND due_date < NOW() - INTERVAL '7 days'
      THEN 25
    ELSE 0 END), 0)) INTO v_payment_score
  FROM rent_payments WHERE tenant_id = p_user_id
    AND due_date >= NOW() - INTERVAL '12 months';

  SELECT CASE COALESCE(bg_check_status, 'pending')
    WHEN 'clear' THEN 100 WHEN 'flagged' THEN 60 ELSE 0 END
  INTO v_bg_score FROM trust_scores WHERE user_id = p_user_id;

  IF v_bg_score IS NULL THEN v_bg_score := 0; END IF;

  SELECT LEAST(100, GREATEST(0,
    (COALESCE(credit_score, 650) - 300)::NUMERIC / 550 * 100
  )) INTO v_credit_score FROM trust_scores WHERE user_id = p_user_id;

  IF v_credit_score IS NULL THEN v_credit_score := 50; END IF;

  SELECT GREATEST(0, 100 - COALESCE(eviction_count, 0) * 50)
  INTO v_eviction_score FROM trust_scores WHERE user_id = p_user_id;

  IF v_eviction_score IS NULL THEN v_eviction_score := 100; END IF;

  SELECT COALESCE(review_avg / 5 * 100, 50)
  INTO v_review_score FROM trust_scores WHERE user_id = p_user_id;

  IF v_review_score IS NULL THEN v_review_score := 50; END IF;

  v_total := ROUND(
    v_payment_score * 3.5 +
    v_bg_score * 2.5 +
    v_credit_score * 2.0 +
    v_eviction_score * 1.0 +
    v_review_score * 1.0
  );

  INSERT INTO trust_scores (user_id, score, last_computed)
  VALUES (p_user_id, v_total, NOW())
  ON CONFLICT (user_id) DO UPDATE SET score = v_total, last_computed = NOW();

  RETURN v_total;
END $$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_spaces_updated_at BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_leases_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tickets_updated_at BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USERS: see own profile; admins see all
CREATE POLICY users_self ON public.users
  FOR ALL USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- SPACES: owners see own; tenants see leased spaces
CREATE POLICY spaces_access ON public.spaces
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.leases l
              WHERE l.space_id = spaces.id
              AND l.tenant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- LEASES: tenant or space owner can view
CREATE POLICY leases_access ON public.leases
  FOR ALL USING (
    tenant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.spaces s
              WHERE s.id = leases.space_id
              AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- RENT_PAYMENTS: tenant sees own; owner sees for owned spaces
CREATE POLICY payments_access ON public.rent_payments
  FOR ALL USING (
    tenant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.leases l
              JOIN public.spaces s ON s.id = l.space_id
              WHERE l.id = rent_payments.lease_id
              AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- MAINTENANCE_TICKETS: reporter or space owner
CREATE POLICY tickets_access ON public.maintenance_tickets
  FOR ALL USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.spaces s
              WHERE s.id = maintenance_tickets.space_id
              AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- TRUST_SCORES: own score only; owners can view tenant scores
CREATE POLICY trust_self ON public.trust_scores
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.leases l
              JOIN public.spaces s ON s.id = l.space_id
              WHERE l.tenant_id = trust_scores.user_id
              AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- NOTIFICATIONS: own only
CREATE POLICY notifications_self ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- AUDIT_LOGS: admins only
CREATE POLICY audit_admin ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════
-- AUTH TRIGGER (AG-002): Sync auth.users -> public.users
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  );
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG TRIGGER (AG-019)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, table_name, record_id, action, after_data)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (actor_id, table_name, record_id, action, before_data, after_data)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, table_name, record_id, action, before_data)
    VALUES (auth.uid(), TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

-- Apply audit triggers to all core tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_spaces AFTER INSERT OR UPDATE OR DELETE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_leases AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_tickets AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_trust AFTER INSERT OR UPDATE OR DELETE ON public.trust_scores
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
