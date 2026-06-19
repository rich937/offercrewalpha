// app/api/podcast/sync/route.ts
import { NextResponse } from 'next/server';

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

async function pollVideoStatus(videoId: string) {
  const res = await fetch(`https://api.heygen.com/v3/videos/${videoId}`, {
    headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY || '' },
  });
  if (!res.ok) throw new Error(`HeyGen error ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: pendingOffers } = await supabase
      .from('offers')
      .select('id, video_id')
      .not('video_id', 'is', null)
      .is('podcast_video_url', null)
      .in('podcast_status', ['generating', 'ready']);

    if (!pendingOffers?.length) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    console.log(`🔄 Background sync: checking ${pendingOffers.length} videos...`);

    let successCount = 0;

    for (const offer of pendingOffers) {
      try {
        const videoData = await pollVideoStatus(offer.video_id!);
        const videoUrl = videoData.video_url || videoData.data?.video_url;

        if (videoUrl) {
          await supabase.from('offers').update({
            podcast_video_url: videoUrl,
            podcast_status: 'completed'
          }).eq('id', offer.id);

          console.log(`✅ Synced ${offer.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`Sync failed for ${offer.id}`, err);
      }
    }

    return NextResponse.json({ success: true, synced: successCount });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}