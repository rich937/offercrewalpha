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

    const systemPrompt = `You are the OfferCrew... ${REFERENCE_GUIDE} ...`; // your full prompt here

    const content: any[] = [{ type: "text", text: systemPrompt }];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
      content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
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
    const crewResponse = data.choices?.[0]?.message?.content || '{"lender":"Unknown","messages":[]}';

    const supabase = getSupabase();

    // Save files
    const filePaths: string[] = [];
    let lender = "Unknown Lender";
    try {
      const match = crewResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        lender = parsed.lender || lender;
      }
    } catch {}

    const offerFolder = `${lender.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${offerFolder}/page-${i}.${file.name.split('.').pop() || 'jpg'}`;
      await supabase.storage.from('mail-pieces').upload(fileName, file, { upsert: true });
      filePaths.push(fileName);
    }

    // Save offer record
    const { error } = await supabase.from('offers').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      lender,
      file_count: files.length,
      file_paths: filePaths,
      sequence_number: Date.now(),
      raw_grok_response: crewResponse,
      crew_conversation: crewResponse,
    });

    if (error) console.error('Save error:', error);

    return NextResponse.json({ success: true, crewResponse });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, crewResponse: "Sorry, analysis failed." });
  }
}