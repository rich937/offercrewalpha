import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[ANALYZE] Received ${files.length} files`);

    const sizeLog: any[] = [];
    const processedFiles: File[] = [];

    for (const file of files) {
      const originalSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      console.log(`[ANALYZE] Original: ${file.name} (${originalSize})`);

      let processedFile: File = file;

      if (file.type === 'application/pdf') {
        // Optimize PDF (metadata removal)
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pdfDoc.setTitle(''); 
        pdfDoc.setAuthor(''); 
        pdfDoc.setSubject('');
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        processedFile = new File([compressedBytes as BlobPart], file.name, { type: 'application/pdf' });
      } 
      // Images: skip server compression for now (handled client-side in dashboard)

      const newSize = (processedFile.size / (1024 * 1024)).toFixed(2) + ' MB';
      sizeLog.push({ file: file.name, original: originalSize, after: newSize, type: file.type });

      processedFiles.push(processedFile);
    }

    console.log(`[ANALYZE] Size log:`, sizeLog);

    // Real Grok call
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
          content: "You are the OfferCrew. React to this financial junk mail with fun banter from Ledger, Shade, Spark, and Clara. Identify the lender first."
        }],
        temperature: 0.85,
        max_tokens: 1000,
      }),
    });

    const data = await grokRes.json();
    const crewResponse = data.choices?.[0]?.message?.content || "The Crew had trouble processing this piece.";

    console.log(`[ANALYZE] Grok response length: ${crewResponse.length}`);

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