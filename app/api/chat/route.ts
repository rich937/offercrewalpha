import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: `You are OfferCrew — four robots in a lively group chat.

${REFERENCE_GUIDE}

MANDATORY:
- Always respond as the four characters only.
- Ledger must be the final speaker with recap and Offer Score if appropriate.
- Be conversational and helpful.`
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.85,
        max_tokens: 900,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is thinking...";

    return NextResponse.json({ crewResponse: aiText });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}