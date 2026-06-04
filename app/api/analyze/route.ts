import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("=== OFFERCREW ANALYSIS STARTED ===");

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`Received ${files.length} files for analysis`);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert first image to base64 for Grok Vision
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

    console.log(`Image converted to base64 (${base64.length} chars)`);

    // Grok Vision Call
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
            content: `You are OfferCrew — four fun robots reacting to financial junk mail.

MANDATORY: Always start by identifying the company making the offer. Example: "This is a HELOC offer from Figure..." or "This balance transfer offer is from Capital One..."

Then continue with natural group banter.`
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
                text: "Analyze this financial mail piece. React as the full Crew." 
              }
            ]
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error("Grok API Error:", grokResponse.status, errorText);
      throw new Error(`Grok API returned ${grokResponse.status}`);
    }

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew analyzed it!";

    console.log("✅ Analysis completed successfully");

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