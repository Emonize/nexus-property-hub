import { describe, it, expect } from 'vitest';

// The fallbackTriage function is not exported, so we test it via the API route.
// Instead, we extract the logic here for unit testing.
// This mirrors the fallbackTriage function in src/app/api/ai/triage/route.ts

function fallbackTriage(description: string) {
  const lower = description.toLowerCase();

  if (lower.includes('fire') || lower.includes('gas leak') || lower.includes('flood') || lower.includes('no heat')) {
    return {
      severity: 'critical',
      category: 'safety',
      urgency_hours: 1,
      diy_possible: false,
      diy_instructions: '',
      estimated_cost_usd: 500,
      vendor_type: 'general_contractor',
      risk_assessment: 'Immediate safety hazard. Requires emergency response.',
    };
  }

  if (lower.includes('leak') || lower.includes('pipe') || lower.includes('water')) {
    return {
      severity: 'high',
      category: 'plumbing',
      urgency_hours: 24,
      diy_possible: false,
      diy_instructions: '',
      estimated_cost_usd: 280,
      vendor_type: 'plumber',
      risk_assessment: 'Water damage may worsen if not addressed within 24 hours.',
    };
  }

  if (lower.includes('electric') || lower.includes('outlet') || lower.includes('circuit')) {
    return {
      severity: 'high',
      category: 'electrical',
      urgency_hours: 24,
      diy_possible: false,
      diy_instructions: '',
      estimated_cost_usd: 200,
      vendor_type: 'electrician',
      risk_assessment: 'Electrical issues pose fire risk.',
    };
  }

  if (lower.includes('scuff') || lower.includes('paint') || lower.includes('scratch') || lower.includes('cosmetic')) {
    return {
      severity: 'cosmetic',
      category: 'cosmetic',
      urgency_hours: 720,
      diy_possible: true,
      diy_instructions: '1. Clean the area. 2. Apply matching touch-up paint. 3. Allow to dry.',
      estimated_cost_usd: 15,
      vendor_type: 'handyman',
      risk_assessment: 'Purely cosmetic. No structural impact.',
    };
  }

  return {
    severity: 'medium',
    category: 'other',
    urgency_hours: 72,
    diy_possible: false,
    diy_instructions: '',
    estimated_cost_usd: 150,
    vendor_type: 'handyman',
    risk_assessment: 'Should be addressed within a few days to prevent further issues.',
  };
}

describe('Maintenance Triage Fallback', () => {
  describe('critical severity', () => {
    it('detects fire emergencies', () => {
      const result = fallbackTriage('There is a fire in the kitchen');
      expect(result.severity).toBe('critical');
      expect(result.category).toBe('safety');
      expect(result.urgency_hours).toBe(1);
    });

    it('detects gas leaks', () => {
      const result = fallbackTriage('I smell a gas leak in unit 3B');
      expect(result.severity).toBe('critical');
      expect(result.diy_possible).toBe(false);
    });

    it('detects flooding', () => {
      const result = fallbackTriage('The basement is starting to flood');
      expect(result.severity).toBe('critical');
    });

    it('detects no heat', () => {
      const result = fallbackTriage('We have no heat and its freezing');
      expect(result.severity).toBe('critical');
    });
  });

  describe('high severity - plumbing', () => {
    it('detects pipe issues', () => {
      const result = fallbackTriage('There is a burst pipe in the bathroom');
      expect(result.severity).toBe('high');
      expect(result.category).toBe('plumbing');
      expect(result.vendor_type).toBe('plumber');
    });

    it('detects water issues', () => {
      const result = fallbackTriage('Water is dripping from the ceiling');
      expect(result.severity).toBe('high');
      expect(result.category).toBe('plumbing');
    });

    it('detects leaks', () => {
      const result = fallbackTriage('The faucet has a slow leak');
      expect(result.severity).toBe('high');
      expect(result.urgency_hours).toBe(24);
    });
  });

  describe('high severity - electrical', () => {
    it('detects electrical issues', () => {
      const result = fallbackTriage('The electric panel is sparking');
      expect(result.severity).toBe('high');
      expect(result.category).toBe('electrical');
      expect(result.vendor_type).toBe('electrician');
    });

    it('detects outlet issues', () => {
      const result = fallbackTriage('The outlet in the bedroom is not working');
      expect(result.severity).toBe('high');
      expect(result.category).toBe('electrical');
    });

    it('detects circuit issues', () => {
      const result = fallbackTriage('The circuit breaker keeps tripping');
      expect(result.severity).toBe('high');
    });
  });

  describe('cosmetic severity', () => {
    it('detects paint issues', () => {
      const result = fallbackTriage('The paint is peeling on the living room wall');
      expect(result.severity).toBe('cosmetic');
      expect(result.diy_possible).toBe(true);
      expect(result.diy_instructions).toContain('touch-up paint');
    });

    it('detects scuff marks', () => {
      const result = fallbackTriage('There is a scuff mark on the floor');
      expect(result.severity).toBe('cosmetic');
      expect(result.estimated_cost_usd).toBe(15);
    });

    it('detects scratches', () => {
      const result = fallbackTriage('Small scratch on the countertop');
      expect(result.severity).toBe('cosmetic');
      expect(result.urgency_hours).toBe(720);
    });
  });

  describe('medium severity (default)', () => {
    it('returns medium for unrecognized issues', () => {
      const result = fallbackTriage('The door is hard to close');
      expect(result.severity).toBe('medium');
      expect(result.category).toBe('other');
      expect(result.urgency_hours).toBe(72);
      expect(result.vendor_type).toBe('handyman');
    });

    it('returns medium for vague descriptions', () => {
      const result = fallbackTriage('Something is broken');
      expect(result.severity).toBe('medium');
      expect(result.diy_possible).toBe(false);
    });
  });

  describe('priority ordering', () => {
    it('critical keywords take precedence over plumbing keywords', () => {
      // "flood" is critical, even though "water" alone would be high
      const result = fallbackTriage('There is a flood in the bathroom');
      expect(result.severity).toBe('critical');
    });
  });
});
