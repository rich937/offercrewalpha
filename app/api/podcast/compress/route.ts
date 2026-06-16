import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { offerId, heygenVideoUrl } = await request.json();

    if (!offerId || !heygenVideoUrl) {
      return NextResponse.json({ error: "offerId and heygenVideoUrl required" }, { status: 400 });
    }

    // Fetch offer to get user_id and folder info
    const { data: offer } = await supabase
      .from('offers')
      .select('user_id, lender, sequence_number')
      .eq('id', offerId)
      .single();

    if (!offer) throw new Error("Offer not found");

    const offerFolder = `${offer.lender.replace(/[^a-zA-Z0-9]/g, '')}-${offer.sequence_number || Date.now()}`;
    const inputPath = `/tmp/heygen-${Date.now()}.mp4`;
    const outputPath = `/tmp/compressed-${Date.now()}.mp4`;
    const finalPath = `${offer.user_id}/${offerFolder}/podcast.mp4`;

    // Download from HeyGen
    await execAsync(`curl -L -o "${inputPath}" "${heygenVideoUrl}"`);

    // Compress with good web settings (target ~8-15MB)
    await execAsync(`ffmpeg -i "${inputPath}" \
      -c:v libx264 -crf 26 -preset medium -vf "scale=1280:-2" \
      -c:a aac -b:a 96k -movflags +faststart \
      "${outputPath}"`);

    // Upload compressed video to Supabase
    const fileBuffer = await fs.readFile(outputPath);
    const { error: uploadError } = await supabase.storage
      .from('mail-pieces')
      .upload(finalPath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('mail-pieces')
      .getPublicUrl(finalPath);

    // Update database
    await supabase
      .from('offers')
      .update({ 
        podcast_video_url: publicUrl,
        podcast_generated_at: new Date().toISOString()
      })
      .eq('id', offerId);

    // Cleanup
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      video_url: publicUrl 
    });

  } catch (error: any) {
    console.error('[PODCAST COMPRESS] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}