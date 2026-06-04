import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(request: NextRequest) {
  try {
    console.log("=== ANALYSIS REQUEST STARTED ===");

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`Received ${files.length} files`);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    let extractedText = '';

    // === REAL OCR ===
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`Running OCR on ${file.name}...`);

      const { data } = await Tesseract.recognize(buffer, 'eng', {
        logger: m => console.log(m)
      });

      extractedText += data.text + '\n\n';
    }

    console.log("Extracted text length:", extractedText.length);

    // === REAL GROK CALL with Character Bible ===
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
- Shade (Purple): Sarcastic cynic, calls out tricks
- Clara (Red): Warm, patient teacher who explains terms
- Ledger (Blue): Serious analyst who gives Offer Score /10 and summary

Use natural back-and-forth banter. Keep it entertaining.`
          },
          {
            role: "user",
            content: `Analyze this financial mail piece. Here is the extracted text:\n\n${extractedText}`
          }
        ],
        temperature: 0.85,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is analyzing it...";

    return NextResponse.json({
      success: true,
      extractedText: extractedText.trim().substring(0, 800),
      crewResponse: aiText
    });

  } catch (error) {
    console.error("CRITICAL ANALYSIS ERROR:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}