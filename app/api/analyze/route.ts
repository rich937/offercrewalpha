import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

         const systemPrompt = `You are the OfferCrew — four lively, entertaining robots (Ledger, Shade, Spark, Clara) reacting to financial junk mail.

${REFERENCE_GUIDE}

MANDATORY RESPONSE FORMAT:
Respond **ONLY** with this exact JSON:

{
  "lender": "Exact Lender Name",
  "product_type": "Personal Loan | Credit Card | HELOC | etc.",
  "max_amount": number or null,
  "intro_rate": string or null,
  "apr": string or null,
  "fees": string or null,
  "url": string or null,
  "qr_codes": ["any QR code text or URL"],
  "messages": [
    {"speaker": "Ledger", "text": "..."},
    {"speaker": "Clara", "text": "..."},
    ...
  ]
}

BANTER RULES — MAKE IT MUCH MORE LIVELY:
- Aim for **10–16 total messages** (much longer group chat).
- Lots of natural back-and-forth: characters reacting to each other, interrupting, agreeing, roasting.
- Spark: chaotic, wild jokes, high energy.
- Shade: sarcastic, calls out tricks and fine print.
- Clara: warm explanations, multiple turns, patient teacher.
- Ledger: starts with lender identification, ends with structured summary + Offer Score.
- Keep the energy high and entertaining.`;



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