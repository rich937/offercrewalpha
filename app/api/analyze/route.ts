import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Simple, reliable response
    return NextResponse.json({
      success: true,
      extractedText: "Mail piece received",
      crewResponse: [
        { type: 'spark', text: "OH MY CIRCUITS! Another offer?! These banks are relentless today! 😂" },
        { type: 'shade', text: "Let me guess... amazing intro rate, then they jack it up later. Classic." },
        { type: 'clara', text: "This is an intro APR offer — a temporary low interest rate." },
        { type: 'ledger', text: "Offer Score: 6.5/10\n• Intro APR: Good\n• Recommendation: Read the fine print carefully" }
      ]
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Analysis failed" 
    }, { status: 500 });
  }
}