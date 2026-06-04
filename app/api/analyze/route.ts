import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("=== ANALYSIS REQUEST STARTED ===");

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`Received ${files.length} files`);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Simple test response for now (to confirm API is reachable)
    return NextResponse.json({
      success: true,
      extractedText: "Test OCR would go here",
      crewResponse: `Spark: OH MY CIRCUITS! This looks like a juicy offer! 🔥\n\nShade: Of course they buried the real rate in the fine print.\n\nClara: This is what's called an introductory APR.\n\nLedger: Offer Score: 7.2/10\n• Good intro rate\n• Watch the balance transfer fees`
    });

  } catch (error) {
    console.error("CRITICAL ANALYSIS ERROR:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}