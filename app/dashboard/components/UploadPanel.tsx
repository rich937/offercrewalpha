// app/dashboard/components/UploadPanel.tsx
'use client';

import { useState } from 'react';

interface UploadPanelProps {
  onUploadComplete: () => void;
  onAnalysisComplete?: (messages: any[]) => void;   // ← NEW
}

export default function UploadPanel({ onUploadComplete, onAnalysisComplete }: UploadPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            if (width > height) height = (height * maxDim) / width;
            else width = (width * maxDim) / height;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            } else resolve(file);
          }, 'image/jpeg', 0.82);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const convertPdfToImages = async (file: File): Promise<File[]> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: File[] = [];
      const numPages = Math.min(pdf.numPages, 4);
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d')!;
        await (page.render as any)({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.65)
        );
        if (blob) {
          const resized = await compressImage(new File([blob], `page-${i}.jpg`, { type: 'image/jpeg' }));
          images.push(resized);
        }
      }
      return images;
    } catch (err) {
      console.error("PDF conversion error:", err);
      return [];
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      let files = Array.from(e.target.files).slice(0, 4);
      const processed: File[] = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          processed.push(compressed);
        } else if (file.type === 'application/pdf') {
          const pdfImages = await convertPdfToImages(file);
          processed.push(...pdfImages);
        } else {
          processed.push(file);
        }
      }
      setSelectedFiles(processed.slice(0, 8));
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    console.log('[UPLOAD] Starting analysis with', selectedFiles.length, 'files');

    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/analyze', { 
        method: 'POST', 
        body: formData 
      });

      const result = await res.json();
      console.log('[UPLOAD] /api/analyze response:', result);

      let messagesToShow: any[] = [];
      try {
        let raw = result.crewResponse || "{}";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) raw = jsonMatch[0];

        const parsed = JSON.parse(raw);

        if (parsed.messages && Array.isArray(parsed.messages)) {
          messagesToShow = parsed.messages.map((item: any) => ({
            type: (item.speaker || 'system').toLowerCase(),
            text: (item.text || String(item)).trim()
          }));
        }
      } catch (e) {
        console.warn("[UPLOAD] JSON parse failed:", e);
        messagesToShow = [{ type: 'Ledger', text: result.crewResponse?.substring(0, 500) || "The Crew responded." }];
      }

      console.log('[UPLOAD] Parsed messages:', messagesToShow);

      // Pass messages up to main page → ChatInterface
      if (onAnalysisComplete) {
        onAnalysisComplete(messagesToShow);
      }

           // After successful parse and onUploadComplete()
      onUploadComplete(); 

      // Extra safety: force refresh again after DB write
      setTimeout(() => {
        onUploadComplete();
      }, 1200);

    } catch (err) {
      console.error('[UPLOAD] Error:', err);
      alert("Sorry, I had trouble analyzing that offer.");
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  return (
    <div className="w-80 flex-shrink-0">
      <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
        <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
        <p className="text-amber-700">Redact name, address, and codes with a Sharpie before uploading.</p>
      </div>

      <input 
        id="fileInput" 
        type="file" 
        accept="image/*,application/pdf" 
        multiple 
        className="hidden" 
        onChange={handleFileSelect} 
      />

      <button
        onClick={() => document.getElementById('fileInput')?.click()}
        className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800"
      >
        📤 Select Photos or PDF (max 4)
      </button>

      {selectedFiles.length > 0 && (
        <button
          onClick={analyzeWithCrew}
          disabled={uploading}
          className="mt-6 w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? 'Analyzing with the Crew...' : 'Send to the Crew →'}
        </button>
      )}
    </div>
  );
}