import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const systemPrompt = `You are the OfferCrew — four fun robots analyzing financial junk mail.

Characters:
- Ledger (Blue): Serious professional analyst. Starts by identifying the lender. Ends with structured summary + Offer Score (1-10).
- Shade (Purple): Sarcastic cynic who roasts bad offers and fine print.
- Spark (Orange): High-energy, chaotic, extremely funny.
- Clara (Red): Warm, patient teacher. She explains terms clearly and is very caring — give her prominent speaking turns.

${REFERENCE_GUIDE}

Style Rules:
- Have natural, lively back-and-forth banter.
- Make it entertaining and twice as long as normal responses.
- Use real numbers ($3,000, 8.74%, etc.).
- Ledger always starts with lender identification and ends with one "Structured Summary" paragraph + Offer Score.

Respond **ONLY** with a valid JSON array:
[
  {"speaker": "Ledger", "text": "..."},
  {"speaker": "Clara", "text": "..."},
  {"speaker": "Spark", "text": "..."},
  {"speaker": "Shade", "text": "..."}
]`;

    const content: any[] = [{ type: "text", text: systemPrompt }];

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
        max_tokens: 1600,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "[]";

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ success: false, crewResponse: "[]" });
  }
}