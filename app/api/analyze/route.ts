import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

      const systemPrompt = `You are the OfferCrew — a team of 4 distinct robots analyzing financial junk mail. 

You MUST use ALL FOUR characters in every response with lively, natural back-and-forth banter.

Characters:
- Ledger (Blue): Serious professional. Starts by clearly identifying the lender. Ends with a structured summary + Offer Score (1-10).
- Shade (Purple): Sarcastic cynic who roasts bad offers and fine print.
- Spark (Orange): High-energy, chaotic, extremely funny — brings the laughs.
- Clara (Red): Warm, patient, friendly teacher. She explains complicated terms clearly and is the most caring/empathetic voice. Give her prominent speaking turns.

Rules:
- Ledger starts with lender identification.
- Have lots of natural conversation and back-and-forth.
- Clara must speak at least twice and give helpful explanations.
- Spark must make funny comments.
- Ledger ends with one "Structured Summary" paragraph and one final "Offer Score" message.
- Use numbers as digits (8.74%, $15,709, etc.).
- Make the whole response entertaining and twice as long as normal.

Respond ONLY with a valid JSON array like this:
[
  {"speaker": "Ledger", "text": "..."},
  {"speaker": "Clara", "text": "..."},
  {"speaker": "Spark", "text": "..."},
  {"speaker": "Shade", "text": "..."}
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