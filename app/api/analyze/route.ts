import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // === COMPRESSION ===
    const processedFiles: File[] = [];
    for (const file of files) {
      let processed = file;
      if (file.type.startsWith('image/')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const compressed = await sharp(buffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        processed = new File([compressed], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pdfDoc.setTitle(''); pdfDoc.setAuthor(''); pdfDoc.setSubject('');
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        processed = new File([compressedBytes], file.name, { type: 'application/pdf' });
      }
      processedFiles.push(processed);
    }

    // === GROK VISION CALL ===
    const imageMessages: any[] = [];
    for (const file of processedFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
      imageMessages.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
    }

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{
          role: "system",
          content: `You are the OfferCrew - four robots reacting to financial junk mail. Be fun, bantery, and accurate.`
        }, {
          role: "user",
          content: [
            ...imageMessages,
            { type: "text", text: "Analyze this mail piece thoroughly with natural group chat banter." }
          ]
        }],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    });

    const grokData = await grokResponse.json();
    const aiText = grokData.choices?.[0]?.message?.content || "The Crew had trouble analyzing this one.";

    return NextResponse.json({ success: true, crewResponse: aiText });

  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analysis failed", message: error.message }, { status: 500 });
  }
}