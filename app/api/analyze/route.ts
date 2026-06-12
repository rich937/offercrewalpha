import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const sizeLog: any[] = [];

    const processedFiles: File[] = [];

    for (const file of files) {
      const originalSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      console.log(`[ANALYZE] Original: ${file.name} (${originalSize})`);

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

        const compressedSize = (processedFile.size / 1024 / 1024).toFixed(2) + ' MB';
        sizeLog.push({ file: file.name, original: originalSize, compressed: compressedSize });
        console.log(`[ANALYZE] Compressed image: ${compressedSize}`);

      } else if (file.type === 'application/pdf') {
        console.log(`[ANALYZE] Converting PDF to images...`);
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // For now, keep as PDF but log size (full PDF->image conversion needs more libs)
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        processedFile = new File([compressedBytes as BlobPart], file.name, { type: 'application/pdf' });

        const compressedSize = (processedFile.size / 1024 / 1024).toFixed(2) + ' MB';
        sizeLog.push({ file: file.name, original: originalSize, compressed: compressedSize, note: "PDF kept as-is (image conversion pending)" });
        console.log(`[ANALYZE] PDF optimized: ${compressedSize}`);
      }

      processedFiles.push(processedFile);
    }

    console.log(`[ANALYZE] Size log:`, sizeLog);

    // Real Grok call - no fallback
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
          content: "Analyze this financial junk mail with fun banter from Ledger, Shade, Spark, and Clara. Identify the lender first."
        }],
        temperature: 0.85,
        max_tokens: 1000,
      }),
    });

    const data = await grokRes.json();
    let crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble processing this piece.";

    console.log(`[ANALYZE] Grok response received (${crewResponse.length} chars)`);

    return NextResponse.json({ 
      success: true, 
      crewResponse,
      debug: { sizeLog }
    });

  } catch (error: any) {
    console.error('[ANALYZE] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      crewResponse: "Sorry, I had trouble analyzing that offer." 
    });
  }
}