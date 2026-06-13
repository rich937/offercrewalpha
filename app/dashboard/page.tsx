'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const getSupabase = () => createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const [username, setUsername] = useState<string>('rich');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{type: string; text: string; username?: string}>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previousOffers, setPreviousOffers] = useState<any[]>([]);

  // Load previous offers
  const loadHistory = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return;

    const { data } = await getSupabase()
      .from('offers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setPreviousOffers(data || []);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          const ratio = maxDim / Math.max(width, height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.82);
      };
      img.src = URL.createObjectURL(file);
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
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d')!;
        await (page.render as any)({ canvasContext: ctx, viewport }).promise;
        
        const blob = await new Promise<Blob | null>((resolve) => 
          canvas.toBlob(resolve, 'image/jpeg', 0.82)
        );
        
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

  const analyzeWithCrew = async (files: File[]) => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setChatMessages([]);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await response.json();

      if (!result.success || !result.crewResponse) throw new Error('No response');

      let messages: Array<{speaker: string; text: string}> = [];
      let rawText = result.crewResponse.trim();

      // Robust JSON extraction
      try {
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) messages = parsed;
      } catch (e) {
        console.warn("JSON parse failed, using fallback");
      }

      if (messages.length === 0) {
        messages = rawText.split('\n')
          .filter((l: string) => l.trim().length > 5)
          .map((line: string) => ({ speaker: 'Spark', text: line.trim() }));
      }

      // Clean messages
      const cleanedMessages = messages.map(msg => ({
        type: msg.speaker.toLowerCase(),
        text: msg.text
          .replace(/^\{"speaker":.*?"text":\s*"/, '')
          .replace(/"\s*\}$/, '')
          .trim()
      })).filter(m => m.text.length > 3);

      setChatMessages(cleanedMessages);

      // Lender detection
      let detectedLender = 'Unknown Lender';
      const firstText = cleanedMessages[0]?.text?.toLowerCase() || rawText.toLowerCase();
      if (firstText.includes('creditninja') || firstText.includes('credit ninja')) detectedLender = 'CreditNinja';
      else if (firstText.includes('sofi')) detectedLender = 'SoFi';
      else if (firstText.includes('pnc')) detectedLender = 'PNC';
      // Add more as needed

      // Save to Supabase
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user) {
        await getSupabase().from('offers').insert({
          user_id: user.id,
          lender: detectedLender,
          file_count: files.length,
          file_paths: [], // expand later if needed
        });
        loadHistory();
      }

    } catch (error) {
      console.error(error);
      setChatMessages([{ type: 'spark', text: "Sorry, the Crew had trouble analyzing that piece. Try again with clearer images!" }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let processedFiles: File[] = [];
    for (const file of files.slice(0, 4)) {
      if (file.type === 'application/pdf') {
        const images = await convertPdfToImages(file);
        processedFiles = [...processedFiles, ...images];
      } else {
        const compressed = await compressImage(file);
        processedFiles.push(compressed);
      }
    }

    setSelectedFiles(processedFiles);
    await analyzeWithCrew(processedFiles);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav & Header - keep your existing */}
      <nav className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-9" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <div className="flex items-center gap-6 text-gray-700">
            <a href="#" className="hover:text-black">Dashboard</a>
            <a href="/blog" className="hover:text-black">Blog / Podcasts</a>
            <a href="/about" className="hover:text-black">About</a>
            <span>Welcome, {username}</span>
            <button className="text-red-600 hover:underline">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* Upload Section */}
        <div className="w-80 flex-shrink-0">
          <h2 className="text-2xl font-bold mb-6">Upload New Offer</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl mb-6">
            <div className="flex items-start gap-3">
              <span>🔒</span>
              <div>
                <p className="font-medium text-amber-800">Privacy First</p>
                <p className="text-sm text-amber-700">Redact name, address, and codes with a Sharpie before uploading.</p>
              </div>
            </div>
          </div>

          <label className="block bg-black text-white text-center py-4 rounded-2xl cursor-pointer hover:bg-gray-800 transition">
            📸 Select Photos or PDF (max 4)
            <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 max-w-[420px]">
          <div className="bg-white border-2 border-gray-200 rounded-3xl overflow-hidden shadow-xl" style={{ height: '620px' }}>
            <div className="bg-blue-600 text-white p-4 flex items-center justify-center">
              <img src="/logo.png" alt="OfferCrew" className="h-7" />
            </div>

            <div className="h-[480px] p-6 overflow-y-auto space-y-6 bg-gray-50" id="chat-window">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'gap-3'}`}>
                  {msg.type !== 'user' && (
                    <img 
                      src={`/icons/${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)} Icon.png`} 
                      alt={msg.type} 
                      className="w-9 h-9 flex-shrink-0 mt-1"
                    />
                  )}
                  <div className="max-w-[80%]">
                    <div className={`text-xs font-semibold mb-1 px-1 ${msg.type === 'user' ? 'text-right text-cyan-600' : 'text-cyan-600'}`}>
                      {msg.type === 'user' ? username : msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}
                    </div>
                    <div className={`px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed ${msg.type === 'user' ? 'bg-cyan-100' : 'bg-white shadow-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isAnalyzing && <div className="text-center text-gray-500">Crew is thinking...</div>}
            </div>
          </div>
        </div>

        {/* Previous Offers */}
        <div className="w-80 flex-shrink-0">
          <h3 className="font-semibold mb-4">Previous Offers</h3>
          <div className="space-y-3">
            {previousOffers.length === 0 ? (
              <p className="text-gray-500 text-sm">No offers yet. Upload one above!</p>
            ) : (
              previousOffers.map((offer, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border">
                  <div className="font-medium">{offer.lender}</div>
                  <div className="text-xs text-gray-500">#{offer.id?.slice(0, 13) || 'new'}</div>
                  <div className="text-xs text-gray-400 mt-1">{offer.file_count} file(s)</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}