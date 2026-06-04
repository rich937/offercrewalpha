import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

export async function POST(request: NextRequest) {
  try {
    console.log("=== OFFERCREW ANALYSIS STARTED ===");

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Process first file for now
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

    // Grok Vision Analysis
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
            content: `You are OfferCrew. Analyze the image and return a structured summary.

${REFERENCE_GUIDE}

Return your response as a natural group chat, but also include clear extraction at the top in this format:

LENDER: [Company Name]
PRODUCT_TYPE: [Credit Card / Home Equity / Personal Loan / etc.]
IS_PREAPPROVED: [true/false]
LEDGER_SCORE: [X.X]

Then continue with the full crew banter.`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: "text", text: "Extract key metadata and then react as the full Crew." }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 1100,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "Analysis failed";

    // Simple parsing for metadata
    const lenderMatch = aiText.match(/LENDER:\s*(.+)/i);
    const productMatch = aiText.match(/PRODUCT_TYPE:\s*(.+)/i);
    const preapprovedMatch = aiText.match(/IS_PREAPPROVED:\s*(true|false)/i);
    const scoreMatch = aiText.match(/LEDGER_SCORE:\s*(\d+\.?\d*)/i);

    const metadata = {
      lender: lenderMatch ? lenderMatch[1].trim() : null,
      product_type: productMatch ? productMatch[1].trim() : null,
      is_preapproved: preapprovedMatch ? preapprovedMatch[1].toLowerCase() === 'true' : false,
      ledger_score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
    };

    console.log("Extracted Metadata:", metadata);

    return NextResponse.json({
      success: true,
      crewResponse: aiText,
      metadata: metadata
    });

  } catch (error) {
    console.error("💥 ANALYSIS ERROR:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}