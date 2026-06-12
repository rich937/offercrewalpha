import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    // Build vision payload
    const content: any[] = [{ 
      type: "text", 
      text: "You are the OfferCrew. Analyze this financial junk mail with fun, natural banter between Ledger (serious), Shade (sarcastic), Spark (chaotic funny), and Clara (warm teacher). Identify the lender first." 
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
        messages: [{ role: "user", content }],
        temperature: 0.85,
        max_tokens: 1200,
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