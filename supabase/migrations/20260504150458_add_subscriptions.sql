ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Allow all current owners to default to 'starter' plan.
UPDATE public.users SET subscription_plan = 'starter', subscription_status = 'active' WHERE role = 'owner';
