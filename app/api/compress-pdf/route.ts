import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Optimize
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // Fixed: Explicit Uint8Array handling
    const compressedBlob = new Blob([new Uint8Array(compressedPdfBytes)], { type: 'application/pdf' });
    const compressedFile = new File([compressedBlob], file.name, { type: 'application/pdf' });

    return new NextResponse(compressedFile, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error) {
    console.error('PDF compression error:', error);
    return NextResponse.json({ error: 'Failed to compress PDF' }, { status: 500 });
  }
}