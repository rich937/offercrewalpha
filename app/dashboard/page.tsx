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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 4);
      setSelectedFiles(files);
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setChatMessages([{ type: 'system', text: `Analyzing ${selectedFiles.length} file(s)...` }]);

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
            {/* LEFT: Upload */}
            <div className="w-80 flex-shrink-0">
              <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
                <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
                <p className="text-amber-700 mb-4">For your protection, please <strong>redact with a black Sharpie</strong>:</p>
                <ul className="list-disc pl-5 space-y-1 text-amber-700 text-xs">
                  <li>Your full name and street address</li>
                  <li>Any personal account numbers</li>
                </ul>
                <p className="mt-4 text-amber-700 text-xs">
                  <strong>Leave visible:</strong> Offer rates, terms, company name, and especially the <strong>QR code</strong>.
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
                    {uploading ? 'Analyzing...' : 'Send Offer to the Crew →'}
                  </button>
                </div>
              )}
            </div>

            {/* CENTER: Chat */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="bg-black rounded-[3rem] p-3 shadow-2xl flex-1 flex flex-col" style={{ maxWidth: '520px', margin: '0 auto' }}>
                <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col overflow-hidden">
                  <div className="bg-blue-100 p-5 flex items-center justify-center border-b">
                    <img src="/logo.png" alt="OfferCrew" className="h-9" />
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-6" style={{ maxHeight: '520px' }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.type === 'system' ? 'justify-center' : 'items-start gap-3'}`}>
                        {msg.type === 'user' ? (
                          <div className="w-11 h-11 flex-shrink-0 rounded-2xl bg-cyan-600 text-white flex items-center justify-center text-xl font-bold mt-1">
                            {getUserInitial()}
                          </div>
                        ) : msg.type !== 'system' && (
                          <img src={getIconPath(msg.type)} alt={msg.type} className="w-11 h-11 flex-shrink-0 rounded-2xl object-cover shadow-md mt-1" />
                        )}
                        <div className={`p-4 rounded-3xl flex-1 max-w-[78%] ${msg.type === 'system' ? 'bg-gray-100 text-center' : msg.type === 'user' ? 'bg-blue-50' : 'bg-white shadow-sm'}`}>
                          {msg.type === 'user' && <div className="text-xs text-blue-600 mb-1 font-medium">{msg.username}</div>}
                          {msg.type !== 'user' && msg.type !== 'system' && <div className="text-xs text-cyan-600 mb-1 font-medium capitalize">{msg.type}</div>}
                          {msg.text}
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
                      <button onClick={sendUserMessage} disabled={isResponding} className="px-8 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 disabled:opacity-50">
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Previous Offers */}
            <div className="w-80 flex-shrink-0">
              <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
              <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
                {history.length === 0 && (
                  <p className="text-gray-400 text-center py-12">No offers yet.<br />Upload your first one!</p>
                )}
                {history.map((offer) => (
                  <div 
                    key={offer.id} 
                    onClick={() => loadPastOffer(offer)} 
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-400 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="font-semibold text-lg">{offer.lender || 'Unknown Lender'}</p>
                      <p className="text-sm text-gray-500">#{String(offer.sequence_number || offer.id).padStart(6, '0')}</p>
                      <p className="text-xs text-gray-400 mt-1">{offer.file_count || 1} file(s)</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      {new Date(offer.created_at).toLocaleDateString()} • {new Date(offer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">About OfferCrew</h2>
            <p className="text-lg mb-8">We turn boring financial junk mail into hilarious commentary from four AI robots: Ledger, Shade, Spark, and Clara.</p>
            <h3 className="text-2xl font-semibold mt-12 mb-6">Legal Documents</h3>
            <div className="space-y-4 text-lg">
              <Link href="/terms" className="block text-cyan-600 hover:underline">→ Terms of Service</Link>
              <Link href="/privacy" className="block text-cyan-600 hover:underline">→ Privacy Policy</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}