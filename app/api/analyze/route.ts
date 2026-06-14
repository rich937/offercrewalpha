import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

         const systemPrompt = `You are the OfferCrew. Analyze the uploaded financial mail piece.

${REFERENCE_GUIDE}

MANDATORY RESPONSE FORMAT — Respond **ONLY** with this exact JSON structure:

{
  "lender": "Exact Lender Name",
  "product_type": "Personal Loan | Credit Card | HELOC | Balance Transfer | etc.",
  "max_amount": number or null,
  "intro_rate": string or null,
  "apr": string or null,
  "fees": string or null,
  "url": string or null,
  "qr_codes": ["any extracted QR code text or URL"],
  "messages": [
    {"speaker": "Ledger", "text": "..."},
    {"speaker": "Clara", "text": "..."},
    {"speaker": "Spark", "text": "..."},
    {"speaker": "Shade", "text": "..."}
  ]
}

Rules:
- Extract as much structured data as possible from the images.
- If a URL or application link is visible, put it in "url".
- If QR codes are present, try to describe or extract the destination URL/text.
- Have lively banter with all 4 characters.
- Ledger starts by identifying the lender and ends with structured summary + Offer Score.
- Use real numbers.`;


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