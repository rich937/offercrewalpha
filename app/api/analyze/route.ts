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

    // Compression
    const processedFiles: File[] = [];
    for (const file of files) {
      let processedFile: File = file;
      if (file.type.startsWith('image/')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const compressedBuffer = await sharp(buffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        processedFile = new File([compressedBuffer as BlobPart], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pdfDoc.setTitle(''); pdfDoc.setAuthor(''); pdfDoc.setSubject('');
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        processedFile = new File([compressedBytes as BlobPart], file.name, { type: 'application/pdf' });
      }
      processedFiles.push(processedFile);
    }

    // Real Grok Vision Call
    const imageParts: any[] = [];
    for (const file of processedFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type || 'image/jpeg';
      imageParts.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` }
      });
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
          role: "user",
          content: [
            { type: "text", text: "You are the OfferCrew. React to this financial junk mail with fun, natural banter between Ledger (serious), Shade (sarcastic), Spark (chaotic funny), and Clara (warm teacher). Start with identifying the lender." },
            ...imageParts
          ]
        }],
        temperature: 0.85,
        max_tokens: 1000,
      }),
    });

    const data = await grokResponse.json();
    const crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble processing this piece.";

    return NextResponse.json({ success: true, crewResponse });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer. Please try again." 
    });
  }
}