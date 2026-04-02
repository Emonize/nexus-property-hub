// ═══════════════════════════════════════════════════
// NEXUS PROPERTY HUB — Database Types
// Auto-generated from PostgreSQL schema
// ═══════════════════════════════════════════════════

export type UserRole = 'owner' | 'manager' | 'tenant' | 'vendor' | 'admin';

export type SpaceType = 'building' | 'home' | 'unit' | 'room' | 'garage' | 'desk' | 'storage' | 'lot' | 'other';

export type SpaceStatus = 'vacant' | 'occupied' | 'maintenance' | 'listed' | 'unlisted';

export type LeaseType = 'fixed' | 'month_to_month' | 'daily' | 'hourly';

export type LeaseStatus = 'pending' | 'active' | 'expired' | 'terminated' | 'draft';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partial';

export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low' | 'cosmetic';

export type TicketStatus = 'open' | 'triaged' | 'in_progress' | 'vendor_assigned' | 'resolved' | 'closed';

export type BgCheckStatus = 'pending' | 'clear' | 'flagged' | 'failed';

// ─── Address ───────────────────────────────────────
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

// ─── Users ─────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  stripe_connect_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Spaces ────────────────────────────────────────
export interface Space {
  id: string;
  parent_id: string | null;
  owner_id: string;
  name: string;
  type: SpaceType;
  address: Address | null;
  floor_plan_url: string | null;
  area_sqft: number | null;
  base_rent: number | null;
  currency: string;
  amenities: string[];
  status: SpaceStatus;
  listing_photos: string[];
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Virtual fields from joins
  children?: Space[];
  owner?: User;
  depth?: number;
}

// ─── Leases ────────────────────────────────────────
export interface Lease {
  id: string;
  space_id: string;
  tenant_id: string;
  lease_type: LeaseType;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
  payment_day: number;
  split_group_id: string | null;
  split_pct: number;
  auto_renew: boolean;
  status: LeaseStatus;
  signed_doc_url: string | null;
  created_at: string;
  updated_at: string;
  // Virtual
  space?: Space;
  tenant?: User;
}

// ─── Rent Payments ─────────────────────────────────
export interface RentPayment {
  id: string;
  lease_id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  stripe_payment_id: string | null;
  stripe_transfer_id: string | null;
  payment_method: string | null;
  late_fee: number;
  notes: string | null;
  created_at: string;
  // Virtual
  lease?: Lease;
  tenant?: User;
}

// ─── Maintenance Tickets ───────────────────────────
export interface MaintenanceTicket {
  id: string;
  space_id: string;
  reporter_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  photo_urls: string[];
  voice_note_url: string | null;
  ai_severity: TicketSeverity | null;
  ai_category: string | null;
  ai_diy_suggestion: string | null;
  ai_cost_estimate: number | null;
  priority: number;
  status: TicketStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Virtual
  space?: Space;
  reporter?: User;
  assignee?: User;
}

// ─── Trust Scores ──────────────────────────────────
export interface TrustScore {
  id: string;
  user_id: string;
  score: number;
  payment_history: number;
  bg_check_status: BgCheckStatus | null;
  bg_check_id: string | null;
  credit_score: number | null;
  eviction_count: number;
  review_avg: number;
  factors: Record<string, unknown>;
  last_computed: string;
  created_at: string;
  // Virtual
  user?: User;
}

// ─── Audit Log ─────────────────────────────────────
export interface AuditLog {
  id: string;
  actor_id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

// ─── Notifications ─────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: 'payment_reminder' | 'maintenance_update' | 'lease_action' | 'trust_update' | 'system';
  title: string;
  body: string;
  channels: ('push' | 'sms' | 'email')[];
  read: boolean;
  snoozed_until: string | null;
  created_at: string;
}

// ─── API Types ─────────────────────────────────────
export interface SpaceTreeNode {
  id: string;
  parent_id: string | null;
  name: string;
  type: SpaceType;
  depth: number;
}

export interface MicroListPayload {
  parent_space_id: string;
  floor_plan_analysis: {
    rooms: Array<{
      name: string;
      type: SpaceType;
      area_sqft: number;
      rentable: boolean;
      base_rent: number;
      amenities: string[];
      bounds: { x: number; y: number; w: number; h: number };
    }>;
    shared_spaces: string[];
  };
  publish: boolean;
  cross_post: ('zillow' | 'apartments_com')[];
}

export interface MaintenanceTriageResult {
  severity: TicketSeverity;
  category: string;
  urgency_hours: number;
  diy_possible: boolean;
  diy_instructions: string;
  estimated_cost_usd: number;
  vendor_type: string;
  risk_assessment: string;
}

export interface DashboardKPIs {
  totalCashFlow: number;
  cashFlowTrend: number[];
  collectionRate: number;
  totalPayments: number;
  collectedPayments: number;
  urgentRepairs: number;
  criticalRepairs: number;
}
