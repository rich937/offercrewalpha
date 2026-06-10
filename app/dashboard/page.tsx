'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs`;

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blog' | 'about'>('dashboard');

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { type: 'system', text: 'The Crew is ready. Upload mail to begin the roast!' }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [latestOffer, setLatestOffer] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) await loadHistory(user.id);
    };
    init();
  }, []);

  const loadHistory = async (userId: string) => {
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setHistory(data || []);
    if (data?.length) setLatestOffer(data[0]);
  };

  // Image compression
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
            if (width > height) { height = (height * maxDim) / width; width = maxDim; }
            else { width = (width * maxDim) / height; height = maxDim; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }));
            } else resolve(file);
          }, 'image/jpeg', 0.82);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // PDF to compressed images (handles 35MB+ iPhone scans)
  const convertPdfToImages = async (file: File): Promise<File[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: File[] = [];
      const numPages = Math.min(pdf.numPages, 4);

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
        if (blob) {
          images.push(new File([blob], `page-${i}.jpg`, { type: 'image/jpeg' }));
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
      let totalProcessed = 0;

      for (const file of files) {
        if (totalProcessed >= 4) break;
        if (file.type === 'application/pdf') {
          const images = await convertPdfToImages(file);
          processed.push(...images.slice(0, 4 - totalProcessed));
          totalProcessed += images.length;
        } else if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          processed.push(compressed);
          totalProcessed++;
        } else {
          processed.push(file);
          totalProcessed++;
        }
      }
      setSelectedFiles(processed.slice(0, 4));
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setChatMessages([{ type: 'system', text: `Processing ${selectedFiles.length} page(s)...` }]);

    try {
      const timestamp = Date.now();
      const offerId = `${user.id}-${timestamp}`;
      const uploadedPaths: string[] = [];

      for (const file of selectedFiles) {
        const filePath = `${user.id}/offers/${offerId}/${file.name}`;
        await supabase.storage.from('mail-pieces').upload(filePath, file, { upsert: true });
        uploadedPaths.push(filePath);
      }

      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await res.json();

      let detectedLender = 'Unknown Lender';
      if (result.crewResponse) {
        const text = result.crewResponse.toLowerCase();
        if (text.includes('citi') || text.includes('strata')) detectedLender = 'Citi';
        else if (text.includes('capital one')) detectedLender = 'Capital One';
        else if (text.includes('figure')) detectedLender = 'Figure';
      }

      const { data: newOffer } = await supabase.from('offers').insert({
        user_id: user.id,
        offer_id: offerId,
        lender: detectedLender,
        file_paths: uploadedPaths,
        file_count: selectedFiles.length,
        sequence_number: timestamp
      }).select().single();

      if (result.crewResponse) {
        const lines = result.crewResponse.split('\n').filter((l: string) => l.trim().length > 5);
        const crewMessages = lines.map((line: string) => {
          const clean = line.trim();
          let type = 'spark';
          const lower = clean.toLowerCase();
          if (lower.startsWith('ledger') || lower.includes('ledger:')) type = 'ledger';
          else if (lower.startsWith('shade') || lower.includes('shade:')) type = 'shade';
          else if (lower.startsWith('clara') || lower.includes('clara:')) type = 'clara';
          else if (lower.startsWith('spark') || lower.includes('spark:')) type = 'spark';
          return { type, text: clean };
        });
        setChatMessages(crewMessages);
      }

      if (newOffer) setLatestOffer(newOffer);
      await loadHistory(user.id);
    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that offer." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || !user || isResponding) return;

    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
    setChatMessages(prev => [...prev, { type: 'user', text: userInput, username }]);

    const question = userInput;
    setUserInput('');
    setIsResponding(true);

    try {
      if (latestOffer?.file_paths?.length) {
        const formData = new FormData();
        const { data: fileData } = await supabase.storage.from('mail-pieces').download(latestOffer.file_paths[0]);
        if (fileData) {
          const file = new File([fileData], 'current-offer.jpg', { type: 'image/jpeg' });
          formData.append('files', file);

          const res = await fetch('/api/analyze', { method: 'POST', body: formData });
          const result = await res.json();

          if (result.crewResponse) {
            const lines = result.crewResponse.split('\n').filter((l: string) => l.trim().length > 5);
            const crewMessages = lines.map((line: string) => {
              const clean = line.trim();
              let type = 'spark';
              const lower = clean.toLowerCase();
              if (lower.startsWith('ledger') || lower.includes('ledger:')) type = 'ledger';
              else if (lower.startsWith('shade') || lower.includes('shade:')) type = 'shade';
              else if (lower.startsWith('clara') || lower.includes('clara:')) type = 'clara';
              else if (lower.startsWith('spark') || lower.includes('spark:')) type = 'spark';
              return { type, text: clean };
            });
            setChatMessages(prev => [...prev, ...crewMessages]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { type: 'clara', text: "Sorry, I'm having trouble responding right now." }]);
    }

    setIsResponding(false);
  };

  // loadPastOffer, getIconPath, getUserInitial functions remain the same as previous version

  const loadPastOffer = async (offer: any) => { /* same as before */ };
  const getIconPath = (type: string) => { /* same */ };
  const getUserInitial = (): string => { /* same */ };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation and Tabs (same as before) */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Welcome, <strong>{user?.user_metadata?.username || user?.email}</strong></span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="text-gray-500 hover:text-black">Sign Out</button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 border-b bg-white">
        <div className="flex gap-10 text-lg font-medium">
          <button onClick={() => setActiveTab('dashboard')} className={`pb-4 border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
          <Link href="/blog" className="pb-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">Blog / Podcasts</Link>
          <button onClick={() => setActiveTab('about')} className={`pb-4 border-b-2 transition-colors ${activeTab === 'about' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>About</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="flex gap-8 h-[calc(100vh-180px)]">
            {/* Upload Panel */}
            <div className="w-80 flex-shrink-0">
              <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
                <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
                <p className="text-amber-700 mb-4">Redact with black Sharpie: name, address, account numbers.</p>
                <p className="text-red-600 text-xs font-medium">Large PDFs & phone photos are automatically compressed.</p>
              </div>

              <input id="fileInput" type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileSelect} />
              <button onClick={() => document.getElementById('fileInput')?.click()} className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800">
                📤 Select Photos or PDF (max 4)
              </button>

              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <p className="font-medium mb-4">{selectedFiles.length} page(s) ready</p>
                  <button onClick={analyzeWithCrew} disabled={uploading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50">
                    {uploading ? 'Processing...' : 'Send to the Crew →'}
                  </button>
                </div>
              )}
            </div>

            {/* Chat Interface + Previous Offers (same as before) */}
            {/* Paste the CENTER and RIGHT panels from previous full file */}
          </div>
        )}
      </div>
    </div>
  );
}