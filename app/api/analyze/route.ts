import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files on Vercel`);
    console.log(`[ANALYZE] GROK_API_KEY present:`, !!process.env.GROK_API_KEY);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    // Simple reliable response for now (we'll add Grok vision once we confirm env works)
    const crewResponse = `Ledger: Got your upload!\n\nShade: Another predatory offer, I bet.\nSpark: TIME TO ROAST THIS JUNK MAIL!! 🔥\nClara: Let me explain the key terms for you...`;

    return NextResponse.json({ 
      success: true, 
      crewResponse,
      debug: { filesReceived: files.length, grokKeyPresent: !!process.env.GROK_API_KEY }
    });

  } catch (error: any) {
    console.error('[ANALYZE] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer." 
    });
  }
}