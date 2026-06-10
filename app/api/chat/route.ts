import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';
import { supabase } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, latestOfferId, filePaths } = body;

    console.log("=== CHAT REQUEST RECEIVED ===");
    console.log("Question:", question);
    console.log("Latest Offer ID:", latestOfferId);
    console.log("File Paths received:", filePaths);

    let imageContents: any[] = [];

    if (filePaths && filePaths.length > 0) {
      console.log(`Attempting to load ${filePaths.length} images...`);
      for (const path of filePaths.slice(0, 4)) {
        const { data: fileData, error } = await supabase.storage
          .from('mail-pieces')
          .download(path);

        if (fileData) {
          const base64 = Buffer.from(await fileData.arrayBuffer()).toString('base64');
          imageContents.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          });
          console.log("✓ Successfully loaded image:", path);
        } else {
          console.log("✗ Failed to load image:", path, error);
        }
      }
    } else {
      console.log("⚠ No filePaths provided!");
    }

    console.log(`Sending ${imageContents.length} images to Grok`);

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: `You are ONLY looking at the CURRENT offer in the images provided. Ignore all previous context.

${REFERENCE_GUIDE}

MANDATORY: Start with "The question is about..." and base everything on the current images only.`
          },
          {
            role: "user",
            content: imageContents.length > 0 
              ? [...imageContents, { type: "text", text: `Question: ${question}` }]
              : `Question: ${question}`
          }
        ],
        temperature: 0.6,
        max_tokens: 1000,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is thinking...";

    return NextResponse.json({ crewResponse: aiText });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ crewResponse: "Sorry, I'm having trouble responding right now." });
  }
}