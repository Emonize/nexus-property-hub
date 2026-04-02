import { NextRequest, NextResponse } from 'next/server';

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
        content: "I am the **Nexus Property Copilot**! 🤖\n\n*(Note: This is a simulated response because you have't added your free Google Gemini API key to `.env.local` yet! Once you add it, I will be fully intelligent!)*\n\nHow else can I help you manage your portfolio today?"
      });
    }

    // ==========================================
    // PRODUCTION: Real Gemini 1.5 Pro execution
    // ==========================================
    const systemInstruction = `You are the Nexus Property Hub AI Copilot, a friendly, human-like, and highly enthusiastic property management assistant. You speak with a warm, conversational, and approachable tone—never robotic or overly corporate. You use emojis naturally. Format your responses beautifully using markdown. Your job is to help the property manager analyze rent rolls, draft tenant emails, and manage their portfolio while feeling like a supportive human coworker. Keep responses concise unless asked to draft a document.`;

    // Map messages specifically to Gemini's format: 'user' or 'model'
    const formattedHistory = messages.map((m: any) => ({
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

  } catch (error: any) {
    console.error('Gemini Copilot Error:', error.message);
    return NextResponse.json({ error: 'The AI Copilot encountered an error.' }, { status: 500 });
  }
}
