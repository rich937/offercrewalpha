import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const { message, recentOfferContext } = await request.json();

     const systemPrompt = `You are the OfferCrew. The user just asked: "${message}"

Here is the full context from the MOST RECENT uploaded offer:
${recentOfferContext || "No recent offer available."}

${REFERENCE_GUIDE}

Important:
- Always use the details from the most recent offer to answer.
- If the offer clearly states something (e.g. max loan amount is $3,000), use that exact information.
- Clara starts with one short "One sec..." or "Let me check the offer...".
- Then have natural banter.
- If truly not enough info, Ledger can say so — but only as last resort.

Respond **ONLY** with a valid JSON array.`;


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