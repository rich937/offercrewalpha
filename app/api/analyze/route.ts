import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const sizeLog: any[] = [];
    const imageParts: any[] = [];

    for (const file of files) {
      const originalSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      console.log(`[ANALYZE] Original: ${file.name} (${originalSize})`);

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

      imageParts.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` }
      });

      sizeLog.push({ file: file.name, size: originalSize });
    }

    console.log(`[ANALYZE] Sending ${imageParts.length} images to Grok`);

    // Real Grok Vision Call
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: "You are the OfferCrew (Ledger, Shade, Spark, Clara). Analyze this financial junk mail piece. Start by identifying the lender and offer type. Then react with natural, fun group banter." 
            },
            ...imageParts
          ]
        }],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble seeing this piece.";

    console.log(`[ANALYZE] Grok response length: ${crewResponse.length} chars`);

    return NextResponse.json({ 
      success: true, 
      crewResponse,
      debug: { sizeLog, imageCount: imageParts.length }
    });

  } catch (error: any) {
    console.error('[ANALYZE] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer." 
    });
  }
}