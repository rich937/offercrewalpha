import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[PODCAST] Generation request received');

  try {
    const { offerId } = await request.json();

    const supabaseUrl = 'https://uhckwrldxoifdcwwhlyq.supabase.co';
    const supabaseAnonKey = 'sb_publishable_OfxWMUFjTA--8eEG0htRnw__d2HYLbw';

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: offer } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Reuse if already stored
    if (offer.podcast_video_url) {
      return NextResponse.json({
        success: true,
        video_url: offer.podcast_video_url,
        status: 'ready'
      });
    }

    // Build short Clara summary
    let script = `Hi everyone, welcome back to OfferCrew! Today we're reviewing a ${offer.lender || 'financial'} offer. `;

    if (offer.crew_conversation && Array.isArray(offer.crew_conversation)) {
      script += "The Crew had a lively discussion: ";
      offer.crew_conversation.slice(0, 5).forEach((msg: any) => {
        script += `${msg.speaker || 'Crew'}: ${msg.text} `;
      });
    }

    const score = offer.ledger_score ? `${offer.ledger_score}/10` : "5 out of 10";
    script += `Ledger scored it a ${score}. Would you take this deal?`;

    const videoTitle = `OfferCrew - ${offer.lender || 'Offer'} #${String(offer.sequence_number || Date.now()).padStart(6, '0')}`;

    // Generate video
    const heygenRes = await fetch('https://api.heygen.com/v3/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
      },
      body: JSON.stringify({
        type: "avatar",
        title: videoTitle,
        avatar_id: "c1b8b344aa15421ebba93018bbf26ca0",
        voice_id: "16a09e4706f74997ba4ed05ea11470f6",
        script: script
      }),
    });

    const heygenData = await heygenRes.json();

    if (!heygenRes.ok) {
      return NextResponse.json({ error: heygenData }, { status: heygenRes.status });
    }

    await supabase.from('offers').update({
      video_id: heygenData.video_id || heygenData.id,
      podcast_status: 'generating'
    }).eq('id', offerId);

    return NextResponse.json({
      success: true,
      video_id: heygenData.video_id || heygenData.id,
      status: 'generating'
    });

  } catch (error: any) {
    console.error('[PODCAST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}