'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

let supabaseClient: any = null;

const getSupabase = () => {
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};

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

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          await loadHistory(currentUser.id, supabase);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadHistory = async (userId: string, supabase: any) => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error loading history:', error);
    else setHistory(data || []);
  };

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

  const getIconPath = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('ledger')) return '/icons/Ledger Icon.png';
    if (t.includes('spark')) return '/icons/Spark Icon.png';
    if (t.includes('shade')) return '/icons/Shade Icon.png';
    if (t.includes('clara')) return '/icons/Clara Icon.png';
    return '/icons/Ledger Icon.png';
  };

  const getUserInitial = () => (user?.email || 'U').charAt(0).toUpperCase();

    const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0 || !user) return;
    setUploading(true);
    setChatMessages([{ type: 'system', text: `Analyzing ${selectedFiles.length} file(s)...` }]);

    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await res.json();

      // === NEW STRUCTURED JSON PARSING ===
      let detectedLender = 'Unknown Lender';
      let messagesToShow: any[] = [];

      try {
        let raw = result.crewResponse || "{}";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) raw = jsonMatch[0];

        const parsed = JSON.parse(raw);

        // Extract lender from top-level field
        if (parsed.lender && typeof parsed.lender === 'string') {
          detectedLender = parsed.lender.trim();
        }

        // Extract messages
        if (Array.isArray(parsed.messages)) {
          messagesToShow = parsed.messages.map((item: any) => ({
            type: (item.speaker || 'spark').toLowerCase(),
            text: (item.text || String(item)).trim()
          }));
        }
      } catch (e) {
        console.warn("Structured JSON parse failed, falling back...", e);
        // Fallback for safety
        messagesToShow = [{ type: 'spark', text: result.crewResponse || "The Crew responded." }];
      }

      // Final cleanup
      messagesToShow = messagesToShow
        .map(msg => ({
          ...msg,
          text: msg.text
            .replace(/^\s*\{.*\}\s*$/g, '')
            .trim()
        }))
        .filter(msg => msg.text.length > 3);

      setChatMessages(messagesToShow.length > 0 ? messagesToShow : [{ type: 'system', text: "The Crew responded." }]);

      // Save to Supabase with clean lender name
      const supabase = getSupabase();
      const { error: insertError } = await supabase.from('offers').insert({
        user_id: user.id,
        lender: detectedLender,
        file_count: selectedFiles.length,
        sequence_number: Date.now(),
      });

      if (insertError) console.error('Failed to save offer:', insertError);
      else await loadHistory(user.id, supabase);

    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that offer." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || isResponding) return;
    const username = user?.email?.split('@')[0] || 'You';
    setChatMessages(prev => [...prev, { type: 'user', text: userInput, username }]);

    const question = userInput;
    setUserInput('');
    setIsResponding(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });
      const data = await res.json();
      if (data.crewResponse) {
        const lines = data.crewResponse.split('\n').filter((l: string) => l.trim());
        const crewMsgs = lines.map((line: string) => ({
          type: 'spark',
          text: line.trim().replace(/^(Ledger|Shade|Spark|Clara):\s*/i, '')
        }));
        setChatMessages(prev => [...prev, ...crewMsgs]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { type: 'clara', text: "Sorry, I'm having trouble responding right now." }]);
    }
    setIsResponding(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Welcome, <strong>{user?.email?.split('@')[0] || 'User'}</strong></span>
            <button onClick={() => window.location.href = '/login'} className="text-gray-500 hover:text-black">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-6 border-b bg-white">
        <div className="flex gap-10 text-lg font-medium">
          <button onClick={() => setActiveTab('dashboard')} className={`pb-4 border-b-2 ${activeTab === 'dashboard' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
          <Link href="/blog" className="pb-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700">Blog / Podcasts</Link>
          <button onClick={() => setActiveTab('about')} className={`pb-4 border-b-2 ${activeTab === 'about' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>About</button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 h-[calc(100vh-180px)]">
          <div className="w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
              <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
              <p className="text-amber-700">Redact name, address, and codes with a Sharpie before uploading.</p>
            </div>

            <input id="fileInput" type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileSelect} />
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
                {uploading ? 'Analyzing...' : 'Send to the Crew →'}
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="bg-black rounded-[3rem] p-3 shadow-2xl flex-1 flex flex-col" style={{ maxWidth: '520px', margin: '0 auto' }}>
              <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col overflow-hidden">
                <div className="bg-blue-100 p-5 flex items-center justify-center border-b">
                  <img src="/logo.png" alt="OfferCrew" className="h-9" />
                </div>

                <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-6" style={{ maxHeight: '520px' }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
                      {msg.type === 'user' ? (
                        <div className="w-11 h-11 bg-cyan-600 text-white rounded-2xl flex items-center justify-center font-bold mt-1 flex-shrink-0">
                          {getUserInitial()}
                        </div>
                      ) : (
                        <img 
                          src={getIconPath(msg.type)} 
                          alt={msg.type} 
                          className="w-11 h-11 rounded-2xl mt-1 flex-shrink-0" 
                        />
                      )}

                      <div className="max-w-[78%]">
                        <div className={`text-sm font-semibold mb-1 px-1 ${msg.type === 'user' ? 'text-right text-cyan-600' : 'text-cyan-600'}`}>
                          {msg.type === 'user' ? (msg.username || 'You') : msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}
                        </div>
                        <div className={`p-4 rounded-3xl shadow-sm ${msg.type === 'user' ? 'bg-blue-100' : 'bg-white'}`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t p-4 bg-white">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
                      placeholder="Ask the Crew a question..."
                      className="flex-1 px-5 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button 
                      onClick={sendUserMessage} 
                      disabled={isResponding} 
                      className="px-8 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
            <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
              {history.length === 0 && (
                <p className="text-gray-400 text-center py-12">No offers yet.<br />Upload your first one!</p>
              )}
              {history.map((offer, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-400 cursor-pointer transition-all">
  <p className="font-semibold text-lg">{offer.lender}</p>
  <p className="text-sm text-gray-500">#{String(offer.sequence_number || i+1).padStart(6, '0')}</p>
  <p className="text-xs text-gray-400 mt-1">{offer.file_count || 1} file(s)</p>
</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}