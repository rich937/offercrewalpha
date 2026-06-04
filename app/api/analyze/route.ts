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

    // Real OCR
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const { data } = await Tesseract.recognize(Buffer.from(arrayBuffer), 'eng', {
        logger: (m) => console.log(m)
      });
      extractedText += data.text + '\n\n';
    }

    // Real Grok API Call with your Character Bible
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
            content: `You are OfferCrew — a lively group of 4 robots reacting to financial junk mail.

Ledger (Blue): Serious professional analyst. Always gives an Offer Score out of 10 and structured breakdown.
Shade (Purple): Sarcastic cynic. Calls out predatory tricks and fine print.
Spark (Orange): High-energy, chaotic, extremely funny. Makes wild jokes.
Clara (Red): Warm, patient teacher. Explains complicated terms in plain English.

Respond in a natural, back-and-forth group chat style with lots of banter.`
          },
          {
            role: "user",
            content: `Here is the text extracted from the mail piece:\n\n${extractedText}`
          }
        ],
        temperature: 0.85,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is thinking...";

    return NextResponse.json({
      success: true,
      extractedText: extractedText.trim(),
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