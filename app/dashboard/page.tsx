'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

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
    if (data && data.length > 0) setLatestOffer(data[0]);
  };

  // Compress images to ~2MB
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale down if too large
          const maxDimension = 1600;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to ~2MB JPEG
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { 
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      let files = Array.from(e.target.files).slice(0, 4);
      
      // Compress images
      const compressedFiles: File[] = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          compressedFiles.push(compressed);
        } else {
          compressedFiles.push(file); // PDFs stay as-is
        }
      }
      
      setSelectedFiles(compressedFiles);
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setChatMessages([{ type: 'system', text: `Processing ${selectedFiles.length} file(s)...` }]);

    try {
      const timestamp = Date.now();
      const offerId = `${user.id}-${timestamp}`;
      const uploadedPaths: string[] = [];

      for (const file of selectedFiles) {
        const filePath = `${user.id}/offers/${offerId}/${file.name}`;
        await supabase.storage.from('mail-pieces').upload(filePath, file);
        uploadedPaths.push(filePath);
      }

      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await res.json();

      let detectedLender = 'Unknown Lender';
      if (result.crewResponse) {
        const text = result.crewResponse.toLowerCase();
        if (text.includes('capital one')) detectedLender = 'Capital One';
        else if (text.includes('discover')) detectedLender = 'Discover';
        else if (text.includes('figure')) detectedLender = 'Figure';
        else if (text.includes('chase')) detectedLender = 'Chase';
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
        const lines = result.crewResponse.split('\n').filter((l: string) => l.trim().length > 8);
        const crewMessages = lines.map((line: string) => {
          const cleanLine = line.trim();
          let type = 'spark';
          const lower = cleanLine.toLowerCase();
          if (lower.startsWith('ledger') || lower.includes('ledger:')) type = 'ledger';
          else if (lower.startsWith('shade') || lower.includes('shade:')) type = 'shade';
          else if (lower.startsWith('clara') || lower.includes('clara:')) type = 'clara';
          else if (lower.startsWith('spark') || lower.includes('spark:')) type = 'spark';
          return { type, text: cleanLine };
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

  // sendUserMessage, loadPastOffer, getIconPath, getUserInitial remain the same as previous version

  const sendUserMessage = async () => {
    if (!userInput.trim() || !user || isResponding) return;

    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';

    setChatMessages(prev => [...prev, { 
      type: 'user', 
      text: userInput,
      username 
    }]);

    const question = userInput;
    setUserInput('');
    setIsResponding(true);

    try {
      if (latestOffer && latestOffer.file_paths && latestOffer.file_paths.length > 0) {
        const formData = new FormData();
        const { data: fileData } = await supabase.storage
          .from('mail-pieces')
          .download(latestOffer.file_paths[0]);

        if (fileData) {
          const file = new File([fileData], 'current-offer.pdf', { type: 'application/pdf' });
          formData.append('files', file);

          const res = await fetch('/api/analyze', { method: 'POST', body: formData });
          const result = await res.json();

          if (result.crewResponse) {
            const lines = result.crewResponse.split('\n').filter((l: string) => l.trim().length > 8);
            const crewMessages = lines.map((line: string) => {
              const cleanLine = line.trim();
              let type = 'spark';
              const lower = cleanLine.toLowerCase();
              if (lower.startsWith('ledger') || lower.includes('ledger:')) type = 'ledger';
              else if (lower.startsWith('shade') || lower.includes('shade:')) type = 'shade';
              else if (lower.startsWith('clara') || lower.includes('clara:')) type = 'clara';
              else if (lower.startsWith('spark') || lower.includes('spark:')) type = 'spark';
              return { type, text: cleanLine };
            });
            setChatMessages(prev => [...prev, ...crewMessages]);
          }
        }
      } else {
        setChatMessages(prev => [...prev, { type: 'clara', text: "I don't have an offer loaded right now. Please upload one first." }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { type: 'clara', text: "Sorry, I'm having trouble responding right now." }]);
    }

    setIsResponding(false);
  };

  const loadPastOffer = async (offer: any) => {
    setLatestOffer(offer);
    setChatMessages([{ type: 'system', text: `Re-analyzing ${offer.lender || 'offer'}...` }]);

    try {
      if (offer.file_paths && offer.file_paths.length > 0) {
        const formData = new FormData();
        const { data: fileData } = await supabase.storage.from('mail-pieces').download(offer.file_paths[0]);
        if (fileData) {
          const file = new File([fileData], 'offer.pdf', { type: 'application/pdf' });
          formData.append('files', file);

          const res = await fetch('/api/analyze', { method: 'POST', body: formData });
          const result = await res.json();

          if (result.crewResponse) {
            const lines = result.crewResponse.split('\n').filter((l: string) => l.trim().length > 8);
            const crewMessages = lines.map((line: string) => {
              const cleanLine = line.trim();
              let type = 'spark';
              const lower = cleanLine.toLowerCase();
              if (lower.startsWith('ledger') || lower.includes('ledger:')) type = 'ledger';
              else if (lower.startsWith('shade') || lower.includes('shade:')) type = 'shade';
              else if (lower.startsWith('clara') || lower.includes('clara:')) type = 'clara';
              else if (lower.startsWith('spark') || lower.includes('spark:')) type = 'spark';
              return { type, text: cleanLine };
            });
            setChatMessages(crewMessages);
          }
        }
      }
    } catch (e) {
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble re-analyzing that offer." }]);
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

  const getUserInitial = (): string => {
    if (!user) return '?';
    const name = user.user_metadata?.username || user.email || 'User';
    return name.charAt(0).toUpperCase();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation and Tab Bar (same) */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Welcome, <strong>{user?.user_metadata?.username || user?.email}</strong></span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="text-gray-500 hover:text-black">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

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
            {/* LEFT: Upload with Compression */}
            <div className="w-80 flex-shrink-0">
              <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
                <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
                <p className="text-amber-700 mb-4">For your protection, please <strong>redact with a black Sharpie</strong>:</p>
                <ul className="list-disc pl-5 space-y-1 text-amber-700 text-xs">
                  <li>Your full name and street address</li>
                  <li>Any personal account numbers</li>
                </ul>
                <p className="mt-4 text-red-600 text-xs font-medium">
                  ⚠️ Large phone photos are automatically compressed to ~2MB.
                </p>
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
                <div className="mt-6">
                  <p className="font-medium mb-4">{selectedFiles.length} file(s) selected</p>
                  <button 
                    onClick={analyzeWithCrew} 
                    disabled={uploading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50"
                  >
                    {uploading ? 'Compressing & Analyzing...' : 'Send Offer to the Crew →'}
                  </button>
                </div>
              )}
            </div>

            {/* CENTER: Chat (same) */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* ... Chat UI unchanged ... */}
            </div>

            {/* RIGHT: Previous Offers (same) */}
            <div className="w-80 flex-shrink-0">
              {/* ... Previous Offers UI unchanged ... */}
            </div>
          </div>
        )}

        {/* About tab unchanged */}
      </div>
    </div>
  );
}