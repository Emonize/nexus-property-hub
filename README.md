# Nexus Property Hub

An ultra-premium, AI-powered property management system built for modern real estate investors, managers, and tenants. Nexus Hub streamlines the entire property lifecycle from onboarding and lease generation, to realtime automated rent collection and AI-triaged maintenance requests.

## 🚀 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Server Components)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime Subscriptions)
- **Payments**: [Stripe Connect](https://stripe.com/connect) (Multi-party routing, Tenant ACH/Card payments)
- **AI Triage**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/) (Automated maintenance cost estimation & DIY instructions)
- **Styling**: Vanilla CSS with modern Glassmorphism, tailored HSL color tokens, and Dynamic Micro-animations (No Tailwind dependency).

## ⚙️ Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/your-username/nexus-hub.git
cd nexus-app
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and add your development API keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Google AI
GOOGLE_AI_API_KEY=your-gemini-key

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Initialization
This project relies on a strictly structured Supabase Postgres database.
1. Open your Supabase Dashboard -> SQL Editor.
2. Run the full schema bootstrap file: `supabase/migrations/001_initial_schema.sql` (Creates Tables, RLS Policies, and standard Auth Triggers).
3. Run the realtime enablement file: `supabase/migrations/002_enable_realtime.sql` (Enables instant websocket updates for tickets and payments).

### 4. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🌐 Production Deployment (Vercel)

Nexus Hub is completely optimized for Vercel. 
1. Push your repository to GitHub.
2. Import the project in Vercel.
3. Add the exact same environment variables into the Vercel Settings panel (using your `_live` keys for Stripe).
4. Deploy!

## 🔐 Security & Architecture

- **Row Level Security (RLS)**: Enforced directly at the Postgres level. Tenants can only query their own leases, spaces, and payments. Owners can only query data linked to spaces they own.
- **Server Actions**: Mutations (creating leases, approving payments) are handled securely via Next.js server actions, avoiding client-side API exposure.
- **Role-Based Access**: The `users` table dictates access control (`owner`, `manager`, `tenant`, `vendor`) synced automatically via a Postgres Trigger hooked to Supabase Auth.
