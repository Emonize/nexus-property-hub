-- ═══════════════════════════════════════════════════════════════
-- NEXUS PROPERTY HUB — Seed Data
-- Test hierarchy: Building > Units > Rooms + sample users/leases
-- ═══════════════════════════════════════════════════════════════

-- Test Users
INSERT INTO public.users (id, email, full_name, role, onboarding_complete) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'owner@nexus.test', 'Marcus Chen', 'owner', true),
  ('a0000000-0000-0000-0000-000000000002', 'manager@nexus.test', 'Sarah Mitchell', 'manager', true),
  ('a0000000-0000-0000-0000-000000000003', 'tenant1@nexus.test', 'Alex Rivera', 'tenant', true),
  ('a0000000-0000-0000-0000-000000000004', 'tenant2@nexus.test', 'Jordan Park', 'tenant', true),
  ('a0000000-0000-0000-0000-000000000005', 'tenant3@nexus.test', 'Priya Sharma', 'tenant', true),
  ('a0000000-0000-0000-0000-000000000006', 'vendor@nexus.test', 'Mike''s Plumbing', 'vendor', true),
  ('a0000000-0000-0000-0000-000000000007', 'admin@nexus.test', 'System Admin', 'admin', true);

-- Space Hierarchy: Building (L0) > Units (L1) > Rooms (L2)
-- Building
INSERT INTO public.spaces (id, parent_id, owner_id, name, type, address, area_sqft, base_rent, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', NULL,
   'a0000000-0000-0000-0000-000000000001',
   'Nexus Tower', 'building',
   '{"street": "123 Main St", "city": "Brooklyn", "state": "NY", "zip": "11201", "country": "US", "lat": 40.6892, "lng": -73.9857}',
   12000, NULL, 'occupied');

-- Units
INSERT INTO public.spaces (id, parent_id, owner_id, name, type, area_sqft, base_rent, status, amenities) VALUES
  ('b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Unit 1A', 'unit', 1200, 3200, 'occupied', '{"washer_dryer","dishwasher","central_ac"}'),
  ('b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Unit 2B', 'unit', 950, 2800, 'occupied', '{"dishwasher","window_ac"}'),
  ('b0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Unit 3C', 'unit', 800, 2200, 'vacant', '{"window_ac"}'),
  ('b0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Garage Bay A', 'garage', 200, 350, 'listed', '{}');

-- Rooms in Unit 1A (split among 3 tenants)
INSERT INTO public.spaces (id, parent_id, owner_id, name, type, area_sqft, base_rent, status) VALUES
  ('b0000000-0000-0000-0000-000000000100', 'b0000000-0000-0000-0000-000000000010',
   'a0000000-0000-0000-0000-000000000001',
   'Bedroom 1', 'room', 300, 1200, 'occupied'),
  ('b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000010',
   'a0000000-0000-0000-0000-000000000001',
   'Bedroom 2', 'room', 280, 1100, 'occupied'),
  ('b0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000010',
   'a0000000-0000-0000-0000-000000000001',
   'Bedroom 3', 'room', 250, 900, 'occupied');

-- Leases (with split group for Unit 1A)
INSERT INTO public.leases (id, space_id, tenant_id, lease_type, start_date, end_date, monthly_rent, deposit, payment_day, split_group_id, split_pct, status) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000100',
   'a0000000-0000-0000-0000-000000000003',
   'fixed', '2026-01-01', '2027-01-01', 1200, 2400, 1,
   'd0000000-0000-0000-0000-000000000001', 37.50, 'active'),
  ('c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000101',
   'a0000000-0000-0000-0000-000000000004',
   'fixed', '2026-01-01', '2027-01-01', 1100, 2200, 1,
   'd0000000-0000-0000-0000-000000000001', 34.38, 'active'),
  ('c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000102',
   'a0000000-0000-0000-0000-000000000005',
   'fixed', '2026-01-01', '2027-01-01', 900, 1800, 1,
   'd0000000-0000-0000-0000-000000000001', 28.12, 'active'),
  -- Standalone lease on Unit 2B
  ('c0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000011',
   'a0000000-0000-0000-0000-000000000003',
   'month_to_month', '2026-02-01', NULL, 2800, 2800, 1,
   NULL, 100.00, 'active');

-- Sample Payments
INSERT INTO public.rent_payments (id, lease_id, tenant_id, amount, due_date, paid_date, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000003', 1200.00, '2026-03-01', '2026-03-01 10:00:00+00', 'paid'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000004', 1100.00, '2026-03-01', '2026-03-02 14:30:00+00', 'paid'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000005', 900.00, '2026-03-01', NULL, 'pending'),
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000003', 2800.00, '2026-03-01', '2026-03-01 09:15:00+00', 'paid'),
  -- Previous month payments
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000003', 1200.00, '2026-02-01', '2026-02-01 10:00:00+00', 'paid'),
  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000004', 1100.00, '2026-02-01', '2026-02-03 11:00:00+00', 'paid'),
  ('e0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000005', 900.00, '2026-02-01', '2026-02-08 16:00:00+00', 'paid');

-- Maintenance Tickets
INSERT INTO public.maintenance_tickets (id, space_id, reporter_id, title, description, ai_severity, ai_category, ai_cost_estimate, status, priority) VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000100',
   'a0000000-0000-0000-0000-000000000003',
   'Leaking kitchen faucet', 'The kitchen faucet has been dripping steadily for 2 days. Water pooling under the sink.',
   'high', 'plumbing', 280.00, 'open', 2),
  ('f0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000101',
   'a0000000-0000-0000-0000-000000000004',
   'Wall scuff in hallway', 'Small scuff mark on hallway wall near entry door.',
   'cosmetic', 'cosmetic', 0.00, 'triaged', 5);

-- Trust Scores
INSERT INTO public.trust_scores (user_id, score, payment_history, bg_check_status, credit_score, eviction_count, review_avg) VALUES
  ('a0000000-0000-0000-0000-000000000003', 820, 95.00, 'clear', 740, 0, 4.5),
  ('a0000000-0000-0000-0000-000000000004', 760, 88.00, 'clear', 690, 0, 4.2),
  ('a0000000-0000-0000-0000-000000000005', 680, 72.00, 'flagged', 620, 1, 3.8);
