import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';   // ← Fixed path

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const systemPrompt = `You are the OfferCrew. Analyze the uploaded financial junk mail.

${REFERENCE_GUIDE}

Additional Instructions:
- Always use all 4 characters with lively banter.
- Clara should explain terms clearly and speak multiple times.
- Spark should be very funny.
- Ledger starts with lender identification and ends with structured summary + Offer Score.
- Use real numbers ($15,709, 8.74%, etc.), not spelled out.

Respond ONLY with a valid JSON array:
[
  {"speaker": "Ledger", "text": "message"},
  {"speaker": "Clara", "text": "message"},
  ...
]`;

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
        temperature: 0.85,
        max_tokens: 1600,
      }),
    });

    const data = await grokRes.json();
    let crewResponse = data.choices?.[0]?.message?.content || "[]";

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ success: false, crewResponse: "[]" });
  }
}