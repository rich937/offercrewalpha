import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert first image (or all) to base64 for Grok Vision
    const imageContents: any[] = [];

    for (const file of files.slice(0, 4)) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type || 'image/jpeg';

      imageContents.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` }
      });
    }

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
            content: `You are OfferCrew — exactly four robots.

${REFERENCE_GUIDE}

MANDATORY RULES:
- ALWAYS start your response by clearly identifying the issuer/lender (e.g. "This is a HELOC offer from Figure..." or "This is a balance transfer offer from Capital One...").
- Extract the lender name as accurately as possible from the images.
- Then continue with normal group banter.
- Ledger must ALWAYS give the final structured recap and Offer Score (1-10).`
          },
          {
            role: "user",
            content: [
              ...imageContents,
              { 
                type: "text", 
                text: "Analyze this financial mail piece. Identify the lender clearly at the beginning." 
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is thinking...";

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