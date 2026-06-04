import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Skip heavy OCR for now - just use filename as placeholder
    const fileNames = files.map(f => f.name).join(", ");
    const placeholderText = `Mail piece uploaded: ${fileNames}. Financial offer document.`;

    // Real Grok call with Character Bible
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
            content: `You are OfferCrew — four fun robots reacting to financial junk mail in a lively group chat.

- Spark (Orange): High-energy, chaotic, extremely funny
- Shade (Purple): Sarcastic cynic who calls out tricks
- Clara (Red): Warm, patient teacher who explains terms
- Ledger (Blue): Serious analyst who gives Offer Score /10

Use natural back-and-forth banter. Be entertaining.`
          },
          {
            role: "user",
            content: `A user just uploaded a financial mail piece. Here is basic info:\n${placeholderText}`
          }
        ],
        temperature: 0.85,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew analyzed it!";

    return NextResponse.json({
      success: true,
      extractedText: placeholderText,
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