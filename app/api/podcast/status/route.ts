import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const offerId = request.nextUrl.searchParams.get('offerId');

  if (!offerId) {
    return NextResponse.json({ error: 'offerId required' }, { status: 400 });
  }

  const supabaseUrl = 'https://uhckwrldxoifdcwwhlyq.supabase.co';
  const supabaseAnonKey = 'sb_publishable_OfxWMUFjTA--8eEG0htRnw__d2HYLbw';

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();

  if (!offer || !offer.video_id) {
    return NextResponse.json({ status: 'not_found' });
  }

  if (offer.podcast_video_url) {
    return NextResponse.json({
      status: 'ready',
      video_url: offer.podcast_video_url
    });
  }

  // Poll HeyGen for status (you can call this from frontend every 5-10 seconds)
  return NextResponse.json({
    status: offer.podcast_status || 'generating',
    video_id: offer.video_id
  });
}