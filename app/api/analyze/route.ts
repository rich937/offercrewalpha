import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    console.log("=== OFFERCREW ANALYSIS STARTED ===");

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`Received ${files.length} files`);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert first image to base64 for Grok Vision
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

    console.log(`Image converted successfully`);

    // Grok Vision Call with Reference Guide
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
            content: `You are OfferCrew — exactly four robots having a lively group chat about financial junk mail.

${REFERENCE_GUIDE}

Remember: 
- Generate TWICE as much banter with natural back-and-forth.
- Ledger must ALWAYS be the final speaker with a structured recap and Offer Score.`
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
                text: "Analyze this financial mail piece thoroughly as the full OfferCrew." 
              }
            ]
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
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