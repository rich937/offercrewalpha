import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files received' }, { status: 400 });
    }

    console.log(`Received ${files.length} file(s)`);

    return NextResponse.json({ 
      success: true, 
      processedCount: files.length,
      message: 'Files received',
      crewResponse: `Ledger: This is a test response from the Crew.\n\nShade: Fine print looks sneaky.\nSpark: TIME TO ROAST!\nClara: Let me explain the terms...` 
    });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}