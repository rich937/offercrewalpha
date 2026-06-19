import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const { message, offerId, userId } = await request.json();

    console.log('[CHAT] Request received:', { message, offerId, hasUserId: !!userId });

    if (!offerId) {
      return NextResponse.json({ 
        success: false, 
        crewResponse: '[{"speaker":"Ledger","text":"Please upload an offer first."}]' 
      });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: offer } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .eq('user_id', userId)
      .single();

    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" });
    }

    const systemPrompt = `You are the OfferCrew — four lively robots: Ledger (serious analyst), Shade (sarcastic), Spark (wild comedian), Clara (patient teacher).

Current Offer Context:
Lender: ${offer.lender}
Raw Analysis: ${offer.raw_grok_response?.substring(0, 800) || "No raw data"}

User Question: "${message}"

${REFERENCE_GUIDE}

MANDATORY: Respond **ONLY** with a valid JSON array like this:
[
  {"speaker": "Clara", "text": "One sec..."},
  {"speaker": "Ledger", "text": "..."},
  ...
]

Make it a fun, natural group conversation. Use real details from the offer.`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.75,
        max_tokens: 1200,
      }),
    });

    const data = await grokRes.json();
    let crewResponse = data.choices?.[0]?.message?.content || '[]';

    console.log('[CHAT] Grok raw response length:', crewResponse.length);

    return NextResponse.json({ 
      success: true, 
      crewResponse 
    });

  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: '[{"speaker":"Ledger","text":"Sorry, the crew is having connection issues right now."}]' 
    });
  }
}