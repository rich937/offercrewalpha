import { NextRequest, NextResponse } from 'next/server';
import REFERENCE_GUIDE from '../../lib/reference-guide';
import { supabase } from '../../lib/supabase';   // Adjust path if needed

export async function POST(request: NextRequest) {
  try {
    const { question, latestOfferId, filePaths } = await request.json();

    let imageContents: any[] = [];

    // If we have file paths from the latest offer, download and convert to base64
    if (filePaths && filePaths.length > 0) {
      for (const path of filePaths.slice(0, 4)) {   // max 4 images
        const { data: fileData, error } = await supabase.storage
          .from('mail-pieces')
          .download(path);

        if (fileData && !error) {
          const base64 = Buffer.from(await fileData.arrayBuffer()).toString('base64');
          const mimeType = 'image/jpeg'; // adjust if needed
          imageContents.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` }
          });
        }
      }
    }

    const userMessage = question 
      ? `The user is asking about the most recent offer: "${question}". Use the provided images and answer in character.`
      : "Continue the conversation.";

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
- Always respond as the four characters only.
- Always refer to the most recent offer shown in the images.
- Ledger must be the final speaker with recap and Offer Score when appropriate.
- Be conversational, helpful, and in character.`
          },
          {
            role: "user",
            content: imageContents.length > 0 
              ? [...imageContents, { type: "text", text: userMessage }]
              : userMessage
          }
        ],
        temperature: 0.8,
        max_tokens: 1100,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew is thinking...";

    return NextResponse.json({ crewResponse: aiText });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ 
      error: "Failed to get response",
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}