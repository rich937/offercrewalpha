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
    if (!offerId) {
      return NextResponse.json({ success: false, error: "offerId is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Fetch the offer
    const { data: offer, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (error || !offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    // 2. If video already exists, return it immediately
    if (offer.podcast_video_url) {
      return NextResponse.json({
        success: true,
        videoUrl: offer.podcast_video_url,
        message: "Using existing video"
      });
    }

    // 3. Build a good Clara summary script (300-450 characters)
    let script = `This is a review of a ${offer.lender} offer. `;
    
    if (offer.crew_conversation && Array.isArray(offer.crew_conversation)) {
      const summary = offer.crew_conversation
        .slice(0, 6)
        .map((m: any) => m.text || m)
        .join(". ");
      script += summary.substring(0, 380) + "... ";
    } else if (offer.raw_grok_response) {
      script += offer.raw_grok_response.substring(0, 350);
    }

    script += " Ledger gave this offer a final score. What do you think?";

    // 4. Call HeyGen (using Clara avatar)
    const heygenRes = await fetch('https://api.heygen.com/v3/videos', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_id: "c1b8b344aa15421ebba93018bbf26ca0",   // ← Your Clara avatar ID
        voice_id: "16a09e4706f74997ba4ed05ea11470f6",   // ← Clara voice
        script: script,
        title: `${offer.lender} Offer Review`,
        test: false
      })
    });

    const heygenData = await heygenRes.json();

    if (!heygenData.video_id) {
      return NextResponse.json({ success: false, error: "Failed to start video generation" });
    }

    const videoId = heygenData.video_id;

    // 5. Save video_id immediately (so we don't regenerate)
    await supabase
      .from('offers')
      .update({ 
        video_id: videoId,
        podcast_status: 'generating'
      })
      .eq('id', offerId);

    return NextResponse.json({
      success: true,
      videoId: videoId,
      message: "Video generation started. It will be available shortly."
    });

  } catch (err: any) {
    console.error("Podcast API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}