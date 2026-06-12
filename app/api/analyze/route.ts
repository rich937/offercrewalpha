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

    const processedFiles: File[] = [];

    for (const file of files) {
      let processedFile: File = file;

      if (file.type.startsWith('image/')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const compressedBuffer = await sharp(buffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();

        // Fixed for Vercel/TS
        processedFile = new File([compressedBuffer as BlobPart], 
          file.name.replace(/\.\w+$/, '.jpg'), 
          { type: 'image/jpeg' }
        );

      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');

        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

        processedFile = new File([compressedBytes as BlobPart], file.name, { 
          type: 'application/pdf' 
        });
      }

      processedFiles.push(processedFile);
    }

    // Placeholder Grok response for now (real call later)
    const crewResponse = `Ledger: This is a test response after compression.\n\nShade: Looks like another junk offer.\nSpark: LET'S ROAST IT!\nClara: Here's what the terms mean...`;

    return NextResponse.json({ 
      success: true, 
      processedCount: processedFiles.length,
      crewResponse 
    });

  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}