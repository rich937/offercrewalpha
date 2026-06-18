// app/dashboard/components/UploadPanel.tsx
'use client';

import { useState, useCallback } from 'react';

interface UploadPanelProps {
  onUploadComplete: () => void;
  onAnalysisComplete: (messages: any[]) => void;
  user: any;
}

export default function UploadPanel({ onUploadComplete, onAnalysisComplete, user }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await uploadFiles(files);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        onUploadComplete();
        onAnalysisComplete(data.messages || []);
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-96 flex-shrink-0">
      <div className="bg-white border border-gray-200 rounded-3xl p-8">
        <h2 className="text-2xl font-semibold mb-6">Upload Your Offers Here:</h2>
        
        <div 
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isDragging ? 'border-cyan-400 bg-cyan-50' : 'border-gray-300'}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
        >
          <input 
            type="file" 
            id="file-upload" 
            multiple 
            className="hidden" 
            onChange={handleFileSelect}
            accept="image/*,.pdf"
          />
          
          <label htmlFor="file-upload" className="cursor-pointer block">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              📸
            </div>
            <p className="font-medium text-lg mb-2">Drop images or PDFs here</p>
            <p className="text-sm text-gray-500 mb-6">or click to browse</p>
          </label>
        </div>

        <div className="mt-8 space-y-4 text-sm">
          <ul className="space-y-3 text-gray-700">
  <li className="flex gap-3">
    <span className="text-red-500 font-medium">•</span>
    <span><strong>Privacy First:</strong> Please cover your name and address — a Sharpie works best</span>
  </li>
  <li className="flex gap-3">
    <span className="text-red-500 font-medium">•</span>
    <span><strong>Photos:</strong> Use your phone to take clear pictures of the envelope, the front and back of the letter, and one additional page that shows the terms (if there is more than one page)</span>
  </li>
  <li className="flex gap-3">
    <span className="text-red-500 font-medium">•</span>
    <span><strong>Formats:</strong> Any image format (JPG, PNG, HEIC, etc.) or PDF is fine</span>
  </li>
</ul>
        </div>
      </div>
    </div>
  );
}