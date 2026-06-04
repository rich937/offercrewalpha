import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert files to base64 for Grok Vision
    const imageContents = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type || 'image/jpeg';

      imageContents.push({
        type: "input_image",
        image_url: `data:${mimeType};base64,${base64}`
      });
    }

    // Real Grok Vision Call with your Character Bible
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",   // or grok-4 if you have access
        messages: [
          {
            role: "system",
            content: `You are OfferCrew — a lively group of 4 robots reacting to financial junk mail.

- Spark (Orange): High-energy, chaotic, extremely funny
- Shade (Purple): Sarcastic cynic who calls out tricks and fine print
- Clara (Red): Warm, patient teacher who explains terms clearly
- Ledger (Blue): Serious professional who gives Offer Score out of 10 and structured summary

Respond in natural, back-and-forth group chat style with lots of banter.`
          },
          {
            role: "user",
            content: [
              ...imageContents,
              { 
                type: "input_text", 
                text: "Analyze this financial mail piece. Describe what you see and give your reactions." 
              }
            ]
          }
        ],
        temperature: 0.85,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew analyzed the mail!";

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