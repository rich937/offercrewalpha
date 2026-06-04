import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert images to base64
    const imageMessages = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

      imageMessages.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`
        }
      });
    }

    // Real Grok Vision Call
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
            content: `You are OfferCrew: 4 fun robots reacting to financial junk mail in a lively group chat.

- Spark (Orange): High-energy, chaotic, extremely funny
- Shade (Purple): Sarcastic cynic, calls out tricks
- Clara (Red): Warm teacher, explains terms
- Ledger (Blue): Serious analyst, gives Offer Score /10

Natural banter, entertaining reactions.`
          },
          {
            role: "user",
            content: [
              ...imageMessages,
              { type: "text", text: "Analyze this financial mail piece. What do you see? React as the Crew." }
            ]
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!grokResponse.ok) {
      throw new Error(`Grok API error: ${grokResponse.status}`);
    }

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is analyzing it...";

    return NextResponse.json({
      success: true,
      crewResponse: aiText
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}