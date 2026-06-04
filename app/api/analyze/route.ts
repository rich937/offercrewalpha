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
      const buffer = Buffer.from(arrayBuffer);

      const { data } = await Tesseract.recognize(buffer, 'eng', {
        logger: m => console.log(m)
      });

      extractedText += data.text + '\n\n';
    }

    console.log("Extracted text:", extractedText.substring(0, 500) + "...");

    // Call Grok with the extracted text + your Character Bible
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

Ledger (Blue): Serious analyst, gives Offer Scores out of 10, structured breakdowns.
Shade (Purple): Sarcastic cynic, calls out tricks.
Spark (Orange): High-energy, chaotic, very funny.
Clara (Red): Warm teacher, explains terms clearly.

Respond in natural back-and-forth group chat style with lots of banter.`
          },
          {
            role: "user",
            content: `Here is the text from the uploaded mail piece:\n\n${extractedText}`
          }
        ],
        temperature: 0.8,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew analyzed it!";

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