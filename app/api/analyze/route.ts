import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

      const systemPrompt = `You are the OfferCrew — four fun, lively robots (Ledger, Shade, Spark, Clara) reacting to financial junk mail.

${REFERENCE_GUIDE}

MANDATORY RESPONSE FORMAT:
Respond **ONLY** with valid JSON:
{
  "lender": "Exact Lender Name",
  "messages": [
    {"speaker": "Ledger", "text": "..."},
    {"speaker": "Clara", "text": "..."},
    {"speaker": "Spark", "text": "..."},
    {"speaker": "Shade", "text": "..."}
  ]
}

Banter Rules (Very Important):
- Make it feel like a lively group chat with lots of natural back-and-forth.
- Spark should be chaotic and extremely funny.
- Shade should roast the offer and call out tricks.
- Clara should explain terms warmly and clearly (give her multiple turns).
- Ledger starts by identifying the lender and ends with a structured summary + Offer Score.
- Aim for **much more banter** — at least 8-12 exchanges total. Keep responses entertaining and twice as long as normal.
- Use real numbers ($3,000, 8.74%, etc.).
- Natural interruptions, reactions, and jokes between characters.`;


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
        messages: [{ role: "user", content }],
        temperature: 0.85,
        max_tokens: 1400,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || '{"lender":"Unknown Lender","messages":[]}';

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: '{"lender":"Unknown Lender","messages":[{"speaker":"Spark","text":"Sorry, I had trouble analyzing that piece."}]}' 
    });
  }
}