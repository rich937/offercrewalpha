import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const { message, recentOfferContext } = await request.json();

    const systemPrompt = `You are the OfferCrew. The user asked: "${message}"

Recent Offer Context:
${recentOfferContext || "No recent offer loaded."}

${REFERENCE_GUIDE}

Response Rules:
- Clara starts with a short "One sec..." or "Let me check that..." ONLY ONCE.
- Then have natural, lively banter answering the question using details from the offer.
- Be specific. If the offer clearly states something (like max loan amount), use that exact information.
- If the offer doesn't have enough detail, Ledger says: "Sorry, the offer doesn't give us enough detail to answer that."
- Keep it fun with Spark jokes and Shade roasts.
- All 4 characters should participate.

Respond **ONLY** with a valid JSON array like:
[
  {"speaker": "Clara", "text": "One sec..."},
  {"speaker": "Ledger", "text": "..."},
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