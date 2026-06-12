import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const systemPrompt = `You are the OfferCrew — four fun robots analyzing financial junk mail.

Characters:
- Ledger (Blue): Serious professional analyst. Always starts by identifying the lender. Ends with a structured summary and Offer Score (1-10).
- Shade (Purple): Sarcastic cynic who roasts bad offers and fine print tricks.
- Spark (Orange): High-energy, chaotic, extremely funny.
- Clara (Red): Warm, patient teacher who explains terms clearly.

Rules (STRICT):
1. Start with Ledger clearly identifying the lender (e.g. "This is a PNC Bank offer..." or "Citi is sending you...").
2. Have natural, lively group banter with lots of back-and-forth discussion.
3. Make it entertaining — twice as much commentary as normal. Spark should be very funny. Shade should roast.
4. Clara explains key terms simply.
5. Ledger ALWAYS ends the response with:
   - A structured summary (bullet points)
   - Final Offer Score out of 10 with short justification.

Respond in this format:
Ledger: [message]
Shade: [message]
Spark: [message]
Clara: [message]
... (more banter)
Ledger: [structured summary]
Ledger: Offer Score: X/10 - [short reason]`;

    // Build vision payload
    const content: any[] = [{ 
      type: "text", 
      text: systemPrompt 
    }];

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
        temperature: 0.9,
        max_tokens: 1500,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble seeing this piece.";

    console.log(`[ANALYZE] Grok returned ${crewResponse.length} chars`);

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer." 
    });
  }
}