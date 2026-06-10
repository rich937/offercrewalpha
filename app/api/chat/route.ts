import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';
import { supabase } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { question, latestOfferId, filePaths } = await request.json();

    let imageContents: any[] = [];

    // Force using the latest offer's images
    if (filePaths && filePaths.length > 0) {
      console.log(`Using ${filePaths.length} images from latest offer`);
      for (const path of filePaths.slice(0, 4)) {
        const { data: fileData } = await supabase.storage
          .from('mail-pieces')
          .download(path);

        if (fileData) {
          const base64 = Buffer.from(await fileData.arrayBuffer()).toString('base64');
          imageContents.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          });
        }
      }
    } else {
      console.log("Warning: No filePaths provided for chat");
    }

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
            content: `You are OfferCrew — exactly four robots.

${REFERENCE_GUIDE}

MANDATORY:
- ALWAYS base your answer on the images provided in this message.
- This is about the MOST RECENT offer the user uploaded.
- Start by identifying the lender if possible.
- Stay in character and be helpful.`
          },
          {
            role: "user",
            content: imageContents.length > 0 
              ? [...imageContents, { type: "text", text: `User question: "${question}"` }]
              : `User question: "${question}"`
          }
        ],
        temperature: 0.75,
        max_tokens: 1000,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is thinking...";

    return NextResponse.json({ crewResponse: aiText });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}