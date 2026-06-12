import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const sizeLog: any[] = [];

    for (const file of files) {
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      console.log(`[ANALYZE] Original: ${file.name} (${originalSizeMB}) Type: ${file.type}`);

      let processedFile: File = file;

      if (file.type === 'application/pdf') {
        console.log(`[ANALYZE] Processing PDF...`);

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Aggressive metadata + optimization
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');

        const compressedBytes = await pdfDoc.save({ 
          useObjectStreams: true,
          addDefaultPage: false 
        });

        processedFile = new File([compressedBytes as BlobPart], file.name, { 
          type: 'application/pdf' 
        });

        const compressedSizeMB = (processedFile.size / (1024 * 1024)).toFixed(2) + ' MB';
        sizeLog.push({
          file: file.name,
          original: originalSizeMB,
          compressed: compressedSizeMB,
          reduction: ((1 - processedFile.size / file.size) * 100).toFixed(1) + '%'
        });

        console.log(`[ANALYZE] PDF Compressed: ${compressedSizeMB} (${sizeLog[0].reduction} reduction)`);
      } else {
        sizeLog.push({ file: file.name, original: originalSizeMB, note: "Image - no server compression" });
      }
    }

    console.log(`[ANALYZE] Final Size Log:`, sizeLog);

    // Grok Vision Call
    const imageParts: any[] = [];
    // (For now, skip full image conversion for PDFs to avoid payload limit)

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
          content: "Analyze this financial junk mail with fun banter from Ledger, Shade, Spark, and Clara."
        }],
        temperature: 0.85,
        max_tokens: 1000,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble processing this piece.";

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