// app/api/podcast/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Polling helper with detailed logging
async function pollVideoStatus(videoId: string, maxAttempts = 30) {
  console.log(`🔍 Starting poll for video: ${videoId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`https://api.heygen.com/v3/videos/${videoId}`, {
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
      },
    });

    const data = await res.json();
    console.log(`📊 Poll ${attempt + 1}/${maxAttempts} - Status:`, data.data?.status || data.status);
    console.log(`📊 Full response snippet:`, JSON.stringify(data, null, 2).substring(0, 800) + "...");

    const status = data.data?.status || data.status;
    const videoUrl = data.data?.video_url || data.video_url;

    if (status === 'completed' || status === 'success') {
      console.log(`✅ Video completed! URL found: ${videoUrl || 'NOT FOUND'}`);
      return data.data || data;
    }

    if (status === 'failed') {
      console.error("❌ Video generation failed on HeyGen");
      throw new Error('Video generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 4000)); // 4 seconds
  }

  console.error("⏰ Polling timeout");
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
    console.log(`🚀 [PODCAST] Starting for offerId:`, request.body ? 'body present' : 'no body');

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

    if (!grokRes.ok) {
      const errText = await grokRes.text();
      console.error("❌ Grok API error:", grokRes.status, errText);
    }

    const grokData = await grokRes.json();
    let script = grokData.choices?.[0]?.message?.content?.trim() || summarizationPrompt;

    console.log("🎙️ FINAL SCRIPT LENGTH:", script.length, "characters");
    console.log("🎙️ FINAL SCRIPT PREVIEW:", script.substring(0, 300) + "...");

    // === HEYGEN VIDEO GENERATION ===
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

    if (!heygenRes.ok) {
      const errorText = await heygenRes.text();
      throw new Error(`HeyGen creation failed: ${heygenRes.status} - ${errorText}`);
    }

    const heygenData = await heygenRes.json();
    const videoId = heygenData.data?.video_id || heygenData.video_id;

    if (!videoId) {
      throw new Error('No video_id returned from HeyGen');
    }

    console.log(`🎥 Video created successfully. videoId: ${videoId}`);

    await supabase.from('offers').update({ 
      video_id: videoId,
      podcast_status: 'generating'
    }).eq('id', offerId);

    // === POLL FOR COMPLETED VIDEO ===
    try {
      const videoData = await pollVideoStatus(videoId);
      console.log("📥 Full videoData from poll:", JSON.stringify(videoData, null, 2));

      const videoUrl = videoData.video_url || videoData.data?.video_url;

      if (videoUrl) {
        await supabase.from('offers').update({
          podcast_video_url: videoUrl,
          podcast_status: 'completed'
        }).eq('id', offerId);

        console.log("✅ SUCCESS: Video URL saved to Supabase:", videoUrl);
      } else {
        console.warn("⚠️ Completed but no video_url found");
      }
    } catch (pollError: any) {
      console.error("❌ Polling failed:", pollError);
      await supabase.from('offers').update({ podcast_status: 'failed' }).eq('id', offerId);
    }

    console.log(`✅ [PODCAST] Finished processing offer ${offerId}`);

    return NextResponse.json({ success: true, videoId });

  } catch (err: any) {
    console.error('[PODCAST] Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

// Background sync every 60 seconds (placed outside the route handler)
let backgroundSyncStarted = false;

if (!backgroundSyncStarted) {
  backgroundSyncStarted = true;
  console.log("🔄 Starting background HeyGen sync (every 60 seconds)...");

  setInterval(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/podcast/sync', { 
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
  }, 60 * 1000);
}