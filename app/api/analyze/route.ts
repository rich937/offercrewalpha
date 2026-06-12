import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const processedFiles: File[] = [];

    for (const file of files) {
      let processedFile: File = file;

      if (file.type.startsWith('image/')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const compressedBuffer = await sharp(buffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();

        processedFile = new File([compressedBuffer as BlobPart], 
          file.name.replace(/\.\w+$/, '.jpg'), 
          { type: 'image/jpeg' }
        );
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pdfDoc.setTitle(''); pdfDoc.setAuthor(''); pdfDoc.setSubject('');
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        processedFile = new File([compressedBytes as BlobPart], file.name, { type: 'application/pdf' });
      }
      processedFiles.push(processedFile);
    }

    // Real Grok call (add GROK_API_KEY to .env.local)
    let crewResponse = "The Crew is thinking...";
    try {
      const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "grok-3",
          messages: [{ role: "user", content: "Analyze this financial junk mail piece with fun group banter from Ledger, Shade, Spark, and Clara." }],
          temperature: 0.9,
        }),
      });
      const data = await grokRes.json();
      crewResponse = data.choices?.[0]?.message?.content || crewResponse;
    } catch (e) {
      console.log("Grok call failed, using fallback");
    }

    return NextResponse.json({ 
      success: true, 
      crewResponse 
    });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer. Try a different file." 
    });
  }
}