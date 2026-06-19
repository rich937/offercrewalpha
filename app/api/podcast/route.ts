// app/api/podcast/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Polling helper for immediate generation
async function pollVideoStatus(videoId: string, maxAttempts = 30) {
  console.log(`🔍 Starting poll for video: ${videoId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`https://api.heygen.com/v3/videos/${videoId}`, {
      headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY || '' },
    });

    const data = await res.json();
    const status = data.data?.status || data.status;
    const videoUrl = data.data?.video_url || data.video_url;

    console.log(`📊 Poll ${attempt + 1}/${maxAttempts} - Status: ${status}`);

    if (status === 'completed' || status === 'success') {
      console.log(`✅ Video completed! URL: ${videoUrl}`);
      return data.data || data;
    }

    if (status === 'failed') throw new Error('Video generation failed');

    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  throw new Error('Video polling timeout');
}

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
    console.log(`🚀 [PODCAST] Processing offerId: ${offerId}`);

    const supabase = getSupabase();
    const { data: offer } = await supabase.from('offers').select('*').eq('id', offerId).single();

    if (!offer) return NextResponse.json({ success: false, error: 'Offer not found' });

    if (offer.podcast_video_url) {
      return NextResponse.json({ success: true, videoUrl: offer.podcast_video_url });
    }

    // === CLARA SUMMARY PROMPT ===
    const summarizationPrompt = `You are Clara from OfferCrew. Create a warm, friendly, natural spoken summary of the crew's conversation.

Rules:
- Speak entirely as Clara (first person).
- Introduce yourself casually as Clara from OfferCrew.
- You may reference what others said, e.g. "Ledger pointed out...", "Spark joked that...", "Shade called out...".
- Keep the total summary between 80-120 words.
- Sound conversational and engaging.
- End exactly with this sentence: "Visit OfferCrew.ink to scan your financial junk mail."

Crew conversation:
${offer.crew_conversation?.map((msg: any) => `${msg.speaker}: ${msg.text}`).join('\n') || 'No conversation data.'}`;

    // Call Grok
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3-fast",
        messages: [{ role: "user", content: summarizationPrompt }],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    const grokData = await grokRes.json();
    let script = grokData.choices?.[0]?.message?.content?.trim() || summarizationPrompt;

    console.log("🎙️ FINAL SCRIPT LENGTH:", script.length);

    // === HEYGEN TEMPLATE (Avatar III) ===
    const heygenRes = await fetch('https://api.heygen.com/v2/template/14fcd4b10d7541bb9a2cbc52c269fc8e/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables: {
          podcast_script: {
            name: "podcast_script",
            type: "text",
            properties: {
              type: "avatar",
              character_id: "c1b8b344aa15421ebba93018bbf26ca0",
              content: script,
              voice_id: "16a09e4706f74997ba4ed05ea11470f6"
            }
          }
        },
        engine: "avatar_iii"
      })
    });

    if (!heygenRes.ok) {
      const errorText = await heygenRes.text();
      throw new Error(`HeyGen failed: ${heygenRes.status} - ${errorText}`);
    }

    const heygenData = await heygenRes.json();
    const videoId = heygenData.data?.video_id || heygenData.video_id;

    if (!videoId) throw new Error('No video_id returned from HeyGen');

    console.log(`🎥 Video created with Avatar III. videoId: ${videoId}`);

    await supabase.from('offers').update({ 
      video_id: videoId,
      podcast_status: 'generating'
    }).eq('id', offerId);

    // Inline poll for immediate result
    const videoData = await pollVideoStatus(videoId);
    const videoUrl = videoData.video_url || videoData.data?.video_url;

    if (videoUrl) {
      await supabase.from('offers').update({
        podcast_video_url: videoUrl,
        podcast_status: 'completed'
      }).eq('id', offerId);
      console.log("✅ SUCCESS: Video URL saved:", videoUrl);
    }

    return NextResponse.json({ success: true, videoId, videoUrl });

  } catch (err: any) {
    console.error('[PODCAST] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

// ==================== BACKGROUND SYNC ====================
let backgroundSyncStarted = false;

if (!backgroundSyncStarted) {
  backgroundSyncStarted = true;
  console.log("🔄 Starting background HeyGen sync (every 45 seconds)...");

  setInterval(async () => {
    try {
      const res = await fetch('https://fuzzy-journey-wrw67j477wqr2vj75-3000.app.github.dev/api/podcast/sync', { 
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.synced && result.synced > 0) {
          console.log(`🔄 Background sync completed: ${result.synced} videos updated`);
        }
      }
    } catch (err) {
      // Silent in background
    }
  }, 45 * 1000);
}