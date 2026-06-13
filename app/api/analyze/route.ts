import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const systemPrompt = `You are the OfferCrew.

First, perform OCR on the images and identify the exact lender name.

Then respond **ONLY** with this exact JSON structure:

{
  "lender": "Exact Lender Name",
  "messages": [
    {"speaker": "Ledger", "text": "message"},
    {"speaker": "Clara", "text": "message"},
    {"speaker": "Spark", "text": "message"},
    {"speaker": "Shade", "text": "message"}
  ]
}

Rules:
- "lender" must be the real company name from the mail (e.g. "CreditNinja", "PNC Bank", "SoFi Bank, N.A.").
- Use all 4 characters with natural banter.
- Ledger starts with lender identification.
- Ledger ends with structured summary + Offer Score.
- Use real numbers.
- ${REFERENCE_GUIDE}`;

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
        temperature: 0.7,
        max_tokens: 1800,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "{}";

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ success: false, crewResponse: "{}" });
  }
}