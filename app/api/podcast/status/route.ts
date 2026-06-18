// app/api/podcast/status/route.ts
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

export async function GET(request: NextRequest) {
  try {
    const offerId = request.nextUrl.searchParams.get('offerId');
    if (!offerId) return NextResponse.json({ success: false, error: 'Missing offerId' });

    const supabase = getSupabase();
    const { data: offer } = await supabase
      .from('offers')
      .select('video_id, podcast_video_url, podcast_status')
      .eq('id', offerId)
      .single();

    if (!offer || !offer.video_id) {
      return NextResponse.json({ success: false, error: 'No video_id found' });
    }

    if (offer.podcast_video_url) {
      return NextResponse.json({ success: true, videoUrl: offer.podcast_video_url, status: 'ready' });
    }

    // Poll HeyGen
    const heygenRes = await fetch(`https://api.heygen.com/v3/videos/${offer.video_id}`, {
      headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY || '' }
    });

    const heygenData = await heygenRes.json();
    const videoData = heygenData.data || heygenData;

    if (videoData.status === 'completed' && videoData.video_url) {
      await supabase.from('offers').update({
        podcast_video_url: videoData.video_url,
        podcast_status: 'ready'
      }).eq('id', offerId);

      return NextResponse.json({ success: true, videoUrl: videoData.video_url, status: 'ready' });
    }

    return NextResponse.json({ 
      success: true, 
      status: videoData.status || 'generating',
      videoUrl: null 
    });

  } catch (err: any) {
    console.error('[STATUS] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}