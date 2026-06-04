import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

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
            content: `You are OfferCrew — four robots reacting to financial junk mail.

${REFERENCE_GUIDE}

IMPORTANT: Do NOT include metadata labels like LENDER:, PRODUCT_TYPE:, etc. in your final response.
Only use them internally for analysis. Respond naturally as the Crew.`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: "text", text: "Analyze this mail piece as the full OfferCrew. Start with the company name." }
            ]
          }
        ],
        temperature: 0.8,
        max_tokens: 1100,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew analyzed it!";

    return NextResponse.json({
      success: true,
      crewResponse: aiText
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}