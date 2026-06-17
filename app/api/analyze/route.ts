// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';

let supabaseClient: any = null;
const getSupabase = () => {
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ success: false, error: "User not found" });
    }

   const systemPrompt = `You are the OfferCrew — four lively, entertaining robots (Ledger, Shade, Spark, Clara) reacting to financial junk mail.
${REFERENCE_GUIDE}

MANDATORY RESPONSE FORMAT:
Respond **ONLY** with this exact JSON:
{
  "lender": "Exact Lender Name",
  "messages": [
    {"speaker": "Ledger", "text": "..."},
    {"speaker": "Clara", "text": "..."},
    ...
  ]
}

BANTER RULES — MAKE IT MUCH MORE LIVELY:
- Aim for **12–18 total messages** (long, natural group chat).
- Lots of back-and-forth: characters reacting to each other, interrupting, agreeing, roasting.
- Spark: chaotic, wild jokes, high energy.
- Shade: sarcastic, calls out tricks.
- Clara: warm explanations, multiple turns.
- Ledger: starts with lender identification, ends with structured summary + Offer Score (1-10).
- Keep energy high and entertaining.`;

    const content: any[] = [{ type: "text", text: systemPrompt }];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
      content.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` }
      });
    }

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{ role: "user", content }],
        temperature: 0.8,
        max_tokens: 1600,
      }),
    });

    const data = await grokRes.json();
    let crewResponse = data.choices?.[0]?.message?.content || '{}';

    // Improved parsing
    let parsed = { lender: "Unknown Lender", messages: [] as any[] };
    try {
      const jsonMatch = crewResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("JSON parse failed, using fallback");
    }

    const lender = parsed.lender || "Unknown Lender";
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];

    // Save to Supabase
    const supabase = getSupabase();
    const filePaths: string[] = [];
    const offerFolder = `${lender.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${userId}/${offerFolder}/page-${i}.jpg`;
      const { error } = await supabase.storage.from('mail-pieces').upload(fileName, file, { upsert: true });
      if (!error) filePaths.push(fileName);
    }

    await supabase.from('offers').insert({
      user_id: userId,
      lender: lender,
      file_count: files.length,
      file_paths: filePaths,
      sequence_number: Date.now(),
      raw_grok_response: crewResponse,
      crew_conversation: messages,
    });

    return NextResponse.json({ 
      success: true, 
      crewResponse,
      lender 
    });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: '{"lender":"Unknown Lender","messages":[{"speaker":"Spark","text":"Sorry, I had trouble analyzing that piece."}]}' 
    });
  }
}