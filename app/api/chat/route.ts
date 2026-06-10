import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';
import { supabase } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { question, latestOfferId, filePaths } = await request.json();

    let imageContents: any[] = [];

    // Reload the most recent offer's images
    if (filePaths && filePaths.length > 0) {
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
    }

    const userPrompt = `The user asked: "${question}". 
Please re-analyze the current offer shown in the images and answer based ONLY on this offer.`;

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
- Always start by acknowledging the question: "The question is about..."
- Then re-analyze the images provided.
- Base your entire answer on the current images only. Do not mix up previous offers.`
          },
          {
            role: "user",
            content: imageContents.length > 0 
              ? [...imageContents, { type: "text", text: userPrompt }]
              : userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1100,
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