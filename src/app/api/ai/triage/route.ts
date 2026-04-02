import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { description, photo_urls } = await request.json();

  if (!description) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    // Fallback: return a default triage based on keywords
    return NextResponse.json(fallbackTriage(description));
  }

  try {
    const prompt = `You are a property maintenance expert.
Analyze this maintenance request and return ONLY valid JSON (no markdown):
{
  "severity": "critical|high|medium|low|cosmetic",
  "category": "plumbing|electrical|hvac|structural|appliance|pest|cosmetic|safety|other",
  "urgency_hours": <number>,
  "diy_possible": true|false,
  "diy_instructions": "<step-by-step if diy_possible, otherwise empty string>",
  "estimated_cost_usd": <number>,
  "vendor_type": "plumber|electrician|handyman|hvac_tech|exterminator|general_contractor",
  "risk_assessment": "<what happens if not fixed>"
}

Maintenance request: ${description}`;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: prompt },
    ];

    // Add photos if available
    if (photo_urls && photo_urls.length > 0) {
      try {
        const response = await fetch(photo_urls[0]);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64,
          },
        });
      } catch {
        // Skip image if fetch fails
      }
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      return NextResponse.json(fallbackTriage(description));
    }

    const result = await geminiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    }

    return NextResponse.json(fallbackTriage(description));
  } catch (error) {
    console.error('AI triage error:', error);
    return NextResponse.json(fallbackTriage(description));
  }
}

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
