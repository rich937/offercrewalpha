// app/api/podcast/route.ts
import { NextRequest, NextResponse } from 'next/server';

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
    const { offerId } = await request.json();

    const supabase = getSupabase();
    const { data: offer } = await supabase.from('offers').select('*').eq('id', offerId).single();

    if (!offer) return NextResponse.json({ success: false, error: 'Offer not found' });

    if (offer.podcast_video_url) {
      return NextResponse.json({ success: true, videoUrl: offer.podcast_video_url });
    }

    let script = `Welcome to OfferCrew! Today we are reviewing a ${offer.lender || 'financial'} offer.\n\n`;
    if (offer.crew_conversation && Array.isArray(offer.crew_conversation)) {
      offer.crew_conversation.forEach((msg: any) => {
        if (msg.text) script += `${msg.speaker || 'Crew'}: ${msg.text}\n\n`;
      });
    }
    script += "Let the crew review your mail! Visit OfferCrew-dot-eye-en-kay.";

    const heygenRes = await fetch('https://api.heygen.com/v3/videos', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "type": "avatar",
        "avatar_id": "c1b8b344aa15421ebba93018bbf26ca0",
        "script": script,
        "voice_id": "16a09e4706f74997ba4ed05ea11470f6",
        "aspect_ratio": "16:9"
      })
    });

    const heygenData = await heygenRes.json();
    const videoId = heygenData.data?.video_id || heygenData.video_id;

    if (videoId) {
      await supabase.from('offers').update({ 
        video_id: videoId,
        podcast_status: 'generating'
      }).eq('id', offerId);
    }

    return NextResponse.json({ success: true, videoId });

  } catch (err: any) {
    console.error('[PODCAST] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}