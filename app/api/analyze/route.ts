import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // For now, use simulated intelligent response based on your Character Bible
    // (We'll add real OCR + Grok later once keys are set)
    const crewResponses = [
      { type: 'spark', text: "OH MY CIRCUITS! Look at this thing! Another 'pre-approved' offer? These banks never quit! 😂" },
      { type: 'shade', text: "Let me guess... amazing intro rate, then they hit you with 29.99% after. Classic." },
      { type: 'clara', text: "An intro rate is a temporary low interest rate offered for the first 12-18 months." },
      { type: 'ledger', text: "Offer Score: 6.5/10\n• Intro APR: Strong\n• Long-term rate: Risky\n• Recommendation: Read the fine print carefully" }
    ];

    return NextResponse.json({
      success: true,
      extractedText: "Sample mail piece text extracted",
      crewResponse: crewResponses
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      message: "Please try again" 
    }, { status: 500 });
  }
}