import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const question = formData.get('question') as string | null;

    let imageContent: any = null;

    if (files.length > 0) {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

      imageContent = { 
        type: "image_url", 
        image_url: { url: `data:${mimeType};base64,${base64}` } 
      };
    }

    const userMessage = question 
      ? `The user asked: "${question}". Respond in character as the Crew.` 
      : "Analyze this financial mail piece. Start with the company name.";

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

MANDATORY:
- Generate plenty of back-and-forth banter (twice as much as normal).
- Always start by identifying the company.
- Ledger must ALWAYS be the final speaker with a structured recap and Offer Score out of 10.
- Never invent new characters.`
          },
          {
            role: "user",
            content: imageContent ? [imageContent, { type: "text", text: userMessage }] : userMessage
          }
        ],
        temperature: 0.8,
        max_tokens: 1100,
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