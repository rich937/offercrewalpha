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

    // Fetch offer
    const { data: offer, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (error || !offer) {
      return NextResponse.json({ success: false, error: 'Offer not found' });
    }

    // Reuse existing video
    if (offer.podcast_video_url) {
      return NextResponse.json({ 
        success: true, 
        videoUrl: offer.podcast_video_url,
        reused: true 
      });
    }

    // Build Clara script
    let script = `Welcome to OfferCrew! Today we're reviewing a ${offer.lender || 'financial'} offer.\n\n`;

    if (offer.crew_conversation && Array.isArray(offer.crew_conversation)) {
      offer.crew_conversation.forEach((msg: any) => {
        if (msg.text) {
          script += `${msg.speaker || 'Crew'}: ${msg.text}\n\n`;
        }
      });
    }

    // Your required closing line
    script += "Let the crew review your mail! Visit OfferCrew-dot-eye-en-kay.";

    // Call HeyGen with Clara avatar
    const heygenRes = await fetch('https://api.heygen.com/v3/videos', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_id: "c1b8b344aa15421ebba93018bbf26ca0",   // Your Clara avatar
        voice_id: "16a09e4706f74997ba4ed05ea11470f6",   // Clara voice
        script: script,
        title: `${offer.lender} Offer Review - OfferCrew`
      })
    });

    const heygenData = await heygenRes.json();
    const videoId = heygenData.video_id;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'HeyGen generation failed' });
    }

    // For now return videoId. In next phase we'll poll for final URL and save it.
    return NextResponse.json({ 
      success: true, 
      videoId,
      message: "Podcast is being generated. It will appear shortly." 
    });

  } catch (err: any) {
    console.error('[PODCAST] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}