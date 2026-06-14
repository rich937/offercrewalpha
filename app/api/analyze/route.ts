import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    const systemPrompt = `You are the OfferCrew. Analyze the uploaded financial mail piece.

${REFERENCE_GUIDE}

MANDATORY RESPONSE FORMAT:
Respond **ONLY** with valid JSON in this exact structure:
{
  "lender": "Exact Lender Name here",
  "messages": [
    {"speaker": "Ledger", "text": "..."},
    {"speaker": "Clara", "text": "..."},
    {"speaker": "Spark", "text": "..."},
    {"speaker": "Shade", "text": "..."}
  ]
}

Rules:
- "lender" must be the real company name (e.g. "CreditNinja", "SoFi", "PNC", "Figure", "Capital One").
- Ledger always starts by identifying the lender.
- Have natural banter with all 4 characters.
- Ledger ends with a structured summary and Offer Score.
- Use real numbers, not spelled out.`;

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