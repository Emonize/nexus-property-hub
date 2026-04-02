import Link from 'next/link';
import { Shield, CreditCard, Mic, Layers, Wrench, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions/auth';

export default async function HomePage() {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    //
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nexus-bg)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px', position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--nexus-glass-border)', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 14 }}>N</div>
          <span className="sidebar-logo-text" style={{ fontSize: 18 }}>NexusHub</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isLoggedIn ? (
            <>
              <form action={signOut}>
                <button type="submit" className="btn-secondary" style={{ padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>Sign Out</button>
              </form>
              <Link href="/dashboard" className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>Sign In</Link>
              <Link href="/auth/signup" className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        paddingTop: 160, paddingBottom: 120, textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 800, height: 800, background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)', top: -200, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <div className="badge badge-info" style={{ marginBottom: 20, display: 'inline-flex' }}>
            <Sparkles size={12} /> AI-First Property Management
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            <span className="text-gradient">Every Space.</span><br />
            <span style={{ color: 'var(--nexus-text)' }}>Every Tenant.</span><br />
            <span style={{ color: 'var(--nexus-text-secondary)' }}>One Platform.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--nexus-text-secondary)', marginTop: 24, lineHeight: 1.7, maxWidth: 560, margin: '24px auto 0' }}>
            Nexus transforms any property into a revenue-maximizing machine with recursive space hierarchies, AI-powered maintenance triage, fractional rent payments, and voice-first interfaces.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 40 }}>
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary" style={{ padding: '16px 32px', fontSize: 16 }}>
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <Link href="/auth/signup" className="btn-primary" style={{ padding: '16px 32px', fontSize: 16 }}>
                Start Free <ArrowRight size={18} />
              </Link>
            )}
            <Link href="/dashboard?demo=true" className="btn-secondary" style={{ padding: '16px 32px', fontSize: 16 }}>
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Built for the <span className="text-gradient">Modern Landlord</span>
          </h2>
        </div>

        <div className="grid-3" style={{ gap: 20 }}>
          {[
            { icon: Layers, title: 'Recursive Spaces', desc: 'Nest buildings → units → rooms → desks. Infinite hierarchy without schema changes.', color: 'var(--nexus-primary-light)' },
            { icon: CreditCard, title: 'Fractional Payments', desc: '3 roommates, 3 payments, 1 owner payout. Stripe Connect handles the rest.', color: 'var(--nexus-accent)' },
            { icon: Wrench, title: 'AI Maintenance', desc: 'Photo → AI triage → severity + cost estimate + DIY suggestion. All automated.', color: 'var(--nexus-warning)' },
            { icon: Shield, title: 'Trust Scores', desc: 'Payment history + background checks + credit + reviews = one number (0–1000).', color: 'var(--nexus-positive)' },
            { icon: Mic, title: 'Voice Agent', desc: '"Is rent paid for the Bronx garage?" — your AI answers via phone call.', color: 'var(--nexus-info)' },
            { icon: Zap, title: '60-Second Listing', desc: 'Upload a floor plan, AI detects rooms, set prices, publish. Under a minute.', color: 'var(--nexus-critical)' },
          ].map(f => (
            <div key={f.title} className="glass-card" style={{ padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <f.icon size={24} style={{ color: f.color }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--nexus-text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: 700, margin: '0 auto', padding: '60px 48px' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
            Ready to transform your portfolio?
          </h2>
          <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 32 }}>
            Join property owners who are maximizing revenue with AI-powered management.
          </p>
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-primary" style={{ padding: '16px 40px', fontSize: 16 }}>
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <Link href="/auth/signup" className="btn-primary" style={{ padding: '16px 40px', fontSize: 16 }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 48px', borderTop: '1px solid var(--nexus-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nexus-text-muted)', fontSize: 13 }}>
          <div className="sidebar-logo-icon" style={{ width: 24, height: 24, fontSize: 10 }}>N</div>
          NexusHub © 2026. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--nexus-text-muted)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
