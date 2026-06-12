import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    // TODO: Add compression + Grok later
    console.log(`✅ Processed ${files.length} file(s)`);

    return NextResponse.json({ 
      success: true,
      crewResponse: `Ledger: Nice upload!\n\nShade: Another predatory offer, I bet.\nSpark: TIME TO ROAST THIS JUNK MAIL!! 🔥\nClara: Let me explain the key terms for you...`
    });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer. Try again!" 
    });
  }
}