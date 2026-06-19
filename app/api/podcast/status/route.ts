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

    if (!offerId) {
      return NextResponse.json({ success: false, error: 'offerId is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: offer } = await supabase
      .from('offers')
      .select('podcast_status, podcast_video_url, video_id')
      .eq('id', offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ success: false, error: 'Offer not found' });
    }

    return NextResponse.json({
      success: true,
      status: offer.podcast_status || 'unknown',
      videoUrl: offer.podcast_video_url,
      videoId: offer.video_id
    });

  } catch (err: any) {
    console.error('[PODCAST STATUS] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}