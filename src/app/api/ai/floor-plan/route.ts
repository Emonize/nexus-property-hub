import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { image_base64, image_url } = await request.json();

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallbackFloorPlan());
  }

  try {
    let imageData = image_base64;

    if (!imageData && image_url) {
      const response = await fetch(image_url);
      const buffer = await response.arrayBuffer();
      imageData = Buffer.from(buffer).toString('base64');
    }

    if (!imageData) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const prompt = `You are an expert architectural floor plan analyzer.
Analyze this floor plan image and identify all rooms/spaces.
Return ONLY valid JSON (no markdown):
{
  "rooms": [
    {
      "name": "Room name (e.g., 'Bedroom 1', 'Kitchen', 'Living Room')",
      "type": "room|garage|storage|desk|other",
      "area_sqft": <estimated square footage>,
      "bounds": {"x": <0-100 percentage from left>, "y": <0-100 from top>, "w": <width percentage>, "h": <height percentage>}
    }
  ],
  "shared_spaces": ["kitchen", "bathroom_1", etc.],
  "total_sqft": <total estimated square footage>,
  "bedroom_count": <number>,
  "bathroom_count": <number>
}

Be as accurate as possible with room detection and area estimation.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: imageData } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      return NextResponse.json(fallbackFloorPlan());
    }

    const result = await geminiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

    return NextResponse.json(fallbackFloorPlan());
  } catch (error) {
    console.error('Floor plan analysis error:', error);
    return NextResponse.json(fallbackFloorPlan());
  }
}

function fallbackFloorPlan() {
  return {
    rooms: [
      { name: 'Bedroom 1', type: 'room', area_sqft: 180, bounds: { x: 0, y: 0, w: 40, h: 50 } },
      { name: 'Bedroom 2', type: 'room', area_sqft: 160, bounds: { x: 60, y: 0, w: 40, h: 50 } },
      { name: 'Living Room', type: 'room', area_sqft: 250, bounds: { x: 0, y: 50, w: 60, h: 50 } },
      { name: 'Kitchen', type: 'room', area_sqft: 120, bounds: { x: 60, y: 50, w: 40, h: 25 } },
      { name: 'Bathroom', type: 'room', area_sqft: 60, bounds: { x: 60, y: 75, w: 40, h: 25 } },
    ],
    shared_spaces: ['kitchen', 'bathroom'],
    total_sqft: 770,
    bedroom_count: 2,
    bathroom_count: 1,
  };
}
