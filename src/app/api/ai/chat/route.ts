import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;

    // ==========================================
    // HYBRID FALLBACK: Mock execution block
    // ==========================================
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      console.warn('⚠️ No GOOGLE_AI_API_KEY found. Using mock AI response.');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI thinking
      return NextResponse.json({
        content: "I am the **Rentova Property Copilot**! 🤖\n\n*(Note: This is a simulated response because you have't added your free Google Gemini API key to `.env.local` yet! Once you add it, I will be fully intelligent!)*\n\nHow else can I help you manage your portfolio today?"
      });
    }

    // ==========================================
    // AUTHENTICATED CONTEXT RESOLUTION
    // ==========================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized AI Access Context' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'tenant';
    const userName = profile?.full_name || 'User';

    // ==========================================
    // POLYMORPHIC SYSTEM PROMPT BOUNDARIES
    // ==========================================
    let systemInstruction = '';
    
    if (role === 'owner' || role === 'manager' || role === 'admin') {
      systemInstruction = `You are the Rentova AI Copilot, a highly capable Property Management Assistant. You are assisting ${userName}, who is a Property Manager/Owner. Your job is to help them analyze rent rolls, draft notices, manage their portfolio, and track financial metrics. You speak with a warm, professional, but clear tone. Keep responses concise unless asked to draft a formal document.`;
    } else if (role === 'vendor') {
      systemInstruction = `You are the Rentova Vendor Dispatch AI. You are assisting ${userName}, a contracted service professional. Your job is to help them manage their work orders, understand maintenance requirements, and track payout timelines. YOU MUST STRICTLY REFUSE any questions related to property ownership, tenant screening, or global financial tracking. Be highly tactical and direct.`;
    } else {
      systemInstruction = `You are the Rentova Tenant Support Agent. You are assisting ${userName}, a valued resident. Your job is to strictly help them understand their lease obligations, format maintenance requests, or explain basic rental portals. YOU MUST STRICTLY REFUSE to answer questions about property management, investments, other tenants, background checks, or landlord analytics. You are a helpful, polite customer service assistant.`;
    }

    // Map messages specifically to Gemini's format: 'user' or 'model'
    const formattedHistory = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const payload = {
      systemInstruction: {
        parts: { text: systemInstruction }
      },
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch Gemini response');
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({ content: textContent });

  } catch (error: Error | unknown) {
    console.error('Gemini Copilot Error:', error instanceof Error ? error.message : 'Unknown Error');
    return NextResponse.json({ error: 'The AI Copilot encountered an error.' }, { status: 500 });
  }
}
