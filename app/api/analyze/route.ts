import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    let extractedText = '';

    // Real OCR using Tesseract
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m)
      });

      extractedText += data.text + '\n';
    }

    // Call Grok API with Character Bible + extracted text
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
            content: `You are the OfferCrew: a group of 4 robots analyzing financial junk mail.
Ledger (Blue): Serious analyst, uses scores, structured breakdowns.
Shade (Purple): Sarcastic cynic, calls out tricks.
Spark (Orange): Chaotic, extremely funny.
Clara (Red): Warm teacher, explains terms clearly.

Respond in a lively group chat style with banter.`
          },
          {
            role: "user",
            content: `Analyze this mail piece:\n\n${extractedText}`
          }
        ],
        temperature: 0.8,
      }),
    });

    const grokData = await grokResponse.json();
    const aiResponse = grokData.choices?.[0]?.message?.content || "The Crew is analyzing...";

    return NextResponse.json({
      success: true,
      extractedText: extractedText.trim(),
      crewResponse: aiResponse
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}