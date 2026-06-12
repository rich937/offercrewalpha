import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

          const systemPrompt = `You are the OfferCrew. Analyze the uploaded financial mail piece.

Respond **only** with a valid JSON array like this:

[
  {"speaker": "Ledger", "text": "First message"},
  {"speaker": "Shade", "text": "Reply"},
  ...
]

Strict Rules:
- Use **numeric formats** for all numbers, money, percentages, and rates (e.g. "$15,709", "8.74%", "7 years", "$100k", "35.24%"). Do NOT spell out numbers in words.
- Ledger must start by clearly identifying the lender.
- Have lively back-and-forth banter.
- Ledger must end with TWO final entries:
  1. A single cohesive "Structured Summary" paragraph (no bullets).
  2. One final "Offer Score" message.

Keep responses natural, entertaining, and conversational.`;

    // Build vision payload
    const content: any[] = [{ 
      type: "text", 
      text: systemPrompt 
    }];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
      content.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` }
      });
    }

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content }],
        temperature: 0.9,
        max_tokens: 1500,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble seeing this piece.";

    console.log(`[ANALYZE] Grok returned ${crewResponse.length} chars`);

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer." 
    });
  }
}