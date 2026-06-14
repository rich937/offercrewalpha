import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const { message, recentOfferContext } = await request.json();

    const systemPrompt = `You are the OfferCrew. The user just asked: "${message}"

Use this context from the most recent offer:
${recentOfferContext || "No recent offer loaded."}

${REFERENCE_GUIDE}

Response Rules:
- Start with Clara saying something like "One sec..." or "Let me think about that..."
- Then have natural group banter answering the question using details from the offer.
- If the offer doesn't have enough info, have Ledger say: "Sorry, the offer doesn't give us enough detail to answer that."
- Keep it fun, with Spark being funny and Shade sarcastic.
- End with Ledger if needed.

Respond **ONLY** with valid JSON array:
[
  {"speaker": "Clara", "text": "One sec..."},
  {"speaker": "...", "text": "..."},
  ...
]`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || '[]';

    return NextResponse.json({ success: true, crewResponse });

  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: '[]' 
    });
  }
}