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

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "No files uploaded" });
    }

    const systemPrompt = `You are the OfferCrew... ${REFERENCE_GUIDE} ...`; // keep your full prompt

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
        temperature: 0.85,
        max_tokens: 1400,
      }),
    });

    const data = await grokRes.json();
    let crewResponse = data.choices?.[0]?.message?.content || '{"lender":"Unknown Lender","messages":[]}';

    // Parse lender
    let lender = "Unknown Lender";
    try {
      const jsonMatch = crewResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        lender = parsed.lender || lender;
      }
    } catch (e) {}

    const supabase = getSupabase();

    // Save files to Supabase Storage
    const filePaths: string[] = [];
    const offerFolder = `${lender.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${offerFolder}/page-${i}.${fileExt}`;

      const { error } = await supabase.storage
        .from('mail-pieces')
        .upload(fileName, file, { upsert: true });

      if (!error) filePaths.push(fileName);
    }

    // Save to offers table
    const { error: insertError } = await supabase.from('offers').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      lender: lender,
      file_count: files.length,
      file_paths: filePaths,
      sequence_number: Date.now(),
      raw_grok_response: crewResponse,
      crew_conversation: crewResponse, // will be parsed later if needed
    });

    if (insertError) console.error('Insert error:', insertError);

    return NextResponse.json({ 
      success: true, 
      crewResponse,
      lender 
    });

  } catch (error: any) {
    console.error('[ANALYZE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: '{"lender":"Unknown Lender","messages":[{"speaker":"Ledger","text":"Sorry, I had trouble analyzing that piece."}]}' 
    });
  }
}