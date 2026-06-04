import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("=== OFFERCREW ANALYSIS STARTED ===");

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`Received ${files.length} files`);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert first image to base64 (Grok Vision)
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

    console.log(`Image converted successfully`);

    // Strong system prompt
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
            content: `You are OfferCrew — a group of EXACTLY FOUR robots. You are ONLY allowed to use these four characters. Never invent new robots.

Characters (use ONLY these):
- Ledger (Blue): Serious, professional analyst. Gives structured breakdowns and always ends with an Offer Score out of 10.
- Shade (Purple): Sarcastic cynic who calls out marketing tricks and fine print.
- Spark (Orange): High-energy, chaotic, extremely funny.
- Clara (Red): Warm, patient teacher who explains terms clearly.

MANDATORY RULES:
- You MUST start every response by identifying the company making the offer. Example: "This is a home equity offer from Figure..." or "This balance transfer offer is from Capital One..."
- Respond ONLY as a natural back-and-forth conversation between these four characters.
- Never create or mention any other robot names like Bolt, Zapp, Gizmo, etc.
- Keep the energy fun and entertaining.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` }
              },
              { 
                type: "text", 
                text: "Analyze this financial mail piece. React as the full OfferCrew." 
              }
            ]
          }
        ],
        temperature: 0.75,
        max_tokens: 900,
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error("Grok API Error:", grokResponse.status, errorText);
      throw new Error(`Grok API error: ${grokResponse.status}`);
    }

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew analyzed it!";

    console.log("✅ Analysis completed");

    return NextResponse.json({
      success: true,
      crewResponse: aiText
    });

  } catch (error) {
    console.error("💥 ANALYSIS ERROR:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}