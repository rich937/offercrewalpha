import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const crewResponse = `Ledger: Got your question.\n\nShade: Typical junk mail trick.\nSpark: LET'S GO!\nClara: Here's what that means...`;

    return NextResponse.json({ 
      success: true,
      crewResponse 
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}