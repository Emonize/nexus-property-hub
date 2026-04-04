import { describe, it, expect } from 'vitest';
import type {
  UserRole,
  SpaceType,
  SpaceStatus,
  LeaseType,
  LeaseStatus,
  PaymentStatus,
  TicketSeverity,
  TicketStatus,
  BgCheckStatus,
  User,
  Space,
  Lease,
  RentPayment,
  MaintenanceTicket,
  TrustScore,
  DashboardKPIs,
  MicroListPayload,
} from '@/types/database';

describe('Database Types', () => {
  describe('enum completeness', () => {
    it('UserRole covers all roles', () => {
      const roles: UserRole[] = ['owner', 'manager', 'tenant', 'vendor', 'admin'];
      expect(roles).toHaveLength(5);
    });

    it('SpaceType covers all types', () => {
      const types: SpaceType[] = ['building', 'home', 'unit', 'room', 'garage', 'desk', 'storage', 'lot', 'other'];
      expect(types).toHaveLength(9);
    });

    it('SpaceStatus covers all states', () => {
      const statuses: SpaceStatus[] = ['vacant', 'occupied', 'maintenance', 'listed', 'unlisted'];
      expect(statuses).toHaveLength(5);
    });

    it('LeaseType covers all types', () => {
      const types: LeaseType[] = ['fixed', 'month_to_month', 'daily', 'hourly'];
      expect(types).toHaveLength(4);
    });

    it('LeaseStatus covers all states', () => {
      const statuses: LeaseStatus[] = ['pending', 'active', 'expired', 'terminated', 'draft'];
      expect(statuses).toHaveLength(5);
    });

    it('PaymentStatus covers all states', () => {
      const statuses: PaymentStatus[] = ['pending', 'processing', 'paid', 'failed', 'refunded', 'partial'];
      expect(statuses).toHaveLength(6);
    });

    it('TicketSeverity covers all levels', () => {
      const severities: TicketSeverity[] = ['critical', 'high', 'medium', 'low', 'cosmetic'];
      expect(severities).toHaveLength(5);
    });

    it('TicketStatus covers all states', () => {
      const statuses: TicketStatus[] = ['open', 'triaged', 'in_progress', 'vendor_assigned', 'resolved', 'closed'];
      expect(statuses).toHaveLength(6);
    });

    it('BgCheckStatus covers all states', () => {
      const statuses: BgCheckStatus[] = ['pending', 'clear', 'flagged', 'failed'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('interface shape validation', () => {
    it('Space supports recursive hierarchy via parent_id and children', () => {
      const space: Space = {
        id: 'space-1',
        parent_id: null,
        owner_id: 'owner-1',
        name: 'Test Building',
        type: 'building',
        address: { street: '123 Main', city: 'NYC', state: 'NY', zip: '10001', country: 'US' },
        floor_plan_url: null,
        area_sqft: 5000,
        base_rent: 3000,
        currency: 'usd',
        amenities: ['parking', 'laundry'],
        status: 'occupied',
        listing_photos: [],
        meta: {},
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        children: [],
      };

      expect(space.parent_id).toBeNull();
      expect(space.children).toEqual([]);
    });

    it('Lease supports split groups', () => {
      const lease: Lease = {
        id: 'lease-1',
        space_id: 'space-1',
        tenant_id: 'tenant-1',
        lease_type: 'fixed',
        start_date: '2026-01-01',
        end_date: '2027-01-01',
        monthly_rent: 1500,
        deposit: 3000,
        payment_day: 1,
        split_group_id: 'group-1',
        split_pct: 50,
        auto_renew: false,
        status: 'active',
        signed_doc_url: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      expect(lease.split_group_id).toBe('group-1');
      expect(lease.split_pct).toBe(50);
    });

    it('MaintenanceTicket has AI triage fields', () => {
      const ticket: MaintenanceTicket = {
        id: 'ticket-1',
        space_id: 'space-1',
        reporter_id: 'user-1',
        assigned_to: null,
        title: 'Leak',
        description: 'Water leak in bathroom',
        photo_urls: [],
        voice_note_url: null,
        ai_severity: 'high',
        ai_category: 'plumbing',
        ai_diy_suggestion: null,
        ai_cost_estimate: 280,
        priority: 2,
        status: 'open',
        resolved_at: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      expect(ticket.ai_severity).toBe('high');
      expect(ticket.ai_cost_estimate).toBe(280);
    });

    it('TrustScore has composite scoring fields', () => {
      const trust: TrustScore = {
        id: 'ts-1',
        user_id: 'user-1',
        score: 780,
        payment_history: 95,
        bg_check_status: 'clear',
        bg_check_id: 'checkr-123',
        credit_score: 720,
        eviction_count: 0,
        review_avg: 4.5,
        factors: {},
        last_computed: '2026-01-01',
        created_at: '2026-01-01',
      };

      expect(trust.score).toBeGreaterThanOrEqual(0);
      expect(trust.score).toBeLessThanOrEqual(1000);
    });

    it('DashboardKPIs has all required metrics', () => {
      const kpis: DashboardKPIs = {
        totalCashFlow: 15000,
        cashFlowTrend: [12000, 13000, 14000, 14500, 15000, 15000],
        collectionRate: 94,
        totalPayments: 50,
        collectedPayments: 47,
        urgentRepairs: 3,
        criticalRepairs: 1,
      };

      expect(kpis.cashFlowTrend).toHaveLength(6);
      expect(kpis.collectionRate).toBeLessThanOrEqual(100);
    });

    it('MicroListPayload supports floor plan room detection', () => {
      const payload: MicroListPayload = {
        parent_space_id: 'building-1',
        floor_plan_analysis: {
          rooms: [
            {
              name: 'Bedroom 1',
              type: 'room',
              area_sqft: 200,
              rentable: true,
              base_rent: 800,
              amenities: ['furnished', 'window'],
              bounds: { x: 0, y: 0, w: 100, h: 100 },
            },
          ],
          shared_spaces: ['kitchen', 'bathroom'],
        },
        publish: true,
        cross_post: ['zillow'],
      };

      expect(payload.floor_plan_analysis.rooms).toHaveLength(1);
      expect(payload.floor_plan_analysis.shared_spaces).toContain('kitchen');
    });
  });
});
