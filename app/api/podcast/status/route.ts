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
      .select('podcast_video_url, podcast_status, video_id')
      .eq('id', offerId)
      .single();

    if (!offer) return NextResponse.json({ success: false, error: 'Offer not found' });

    return NextResponse.json({
      success: true,
      videoUrl: offer.podcast_video_url,
      status: offer.podcast_video_url ? 'ready' : (offer.podcast_status || 'generating'),
      videoId: offer.video_id
    });

  } catch (err: any) {
    console.error('[PODCAST STATUS] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}