'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    if (plan === 'enterprise') {
      window.location.href = 'mailto:contact@nexushub.com';
      return;
    }
    if (plan === 'starter') {
      router.push('/auth/signup');
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(`Error starting checkout: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start checkout process.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$0',
      period: '/mo',
      description: 'Perfect for small landlords getting started.',
      features: ['Up to 2 Properties', 'Basic Rent Collection', 'Standard Email Support', 'Manual Maintenance Tracking'],
      buttonText: 'Get Started for Free',
      highlight: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$12',
      period: '/mo',
      description: 'Our most popular plan for growing portfolios.',
      features: ['Up to 10 Properties', 'AI Maintenance Triage', 'Automated Late Fees', 'Priority Support'],
      buttonText: 'Subscribe to Pro',
      highlight: true,
    },
    {
      id: 'scale',
      name: 'Scale',
      price: '$1',
      period: '/unit/mo',
      description: 'For managers scaling beyond 10 properties.',
      features: ['Unlimited Properties ($1/unit)', 'Advanced Analytics', 'Custom Workflows', 'Dedicated Account Manager'],
      buttonText: 'Scale Your Portfolio',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-gold/30 selection:text-gold pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight">
            Simple, Transparent <span className="text-gold font-medium">Pricing</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl font-light">
            Whether you own 1 property or manage 100, we have a plan designed to help you automate and scale your real estate portfolio.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative p-8 rounded-2xl flex flex-col transition-transform duration-300 hover:-translate-y-2 ${
                plan.highlight 
                  ? 'bg-gradient-to-b from-zinc-900 to-black border border-gold/50 shadow-2xl shadow-gold/10' 
                  : 'bg-zinc-950 border border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-black text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-medium mb-2">{plan.name}</h3>
                <p className="text-zinc-400 text-sm mb-6 h-10">{plan.description}</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-light">{plan.price}</span>
                  <span className="text-zinc-500 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <svg className={`h-5 w-5 mr-3 shrink-0 ${plan.highlight ? 'text-gold' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-6 rounded-lg text-sm font-medium transition-colors ${
                  plan.highlight ? 'bg-gold text-black hover:bg-gold/90' : 'border border-white/20 hover:bg-white/5'
                }`}
                disabled={loadingPlan === plan.id}
                onClick={() => handleSubscribe(plan.id)}
              >
                {loadingPlan === plan.id ? 'Processing...' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise Banner */}
        <div className="mt-16 bg-zinc-900/50 border border-white/10 rounded-2xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0 max-w-2xl">
            <h3 className="text-2xl font-medium mb-2">Enterprise Organization?</h3>
            <p className="text-zinc-400">
              Need custom integrations, SLA agreements, or volume discounting? Contact our sales team to design a bespoke package for your firm.
            </p>
          </div>
          <button
            className="border border-white/20 hover:bg-white/5 py-3 px-6 rounded-lg font-medium whitespace-nowrap transition-colors"
            onClick={() => handleSubscribe('enterprise')}
          >
            Contact Sales
          </button>
        </div>

      </div>
    </div>
  );
}
