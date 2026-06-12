'use client';

import { useEffect, useState } from 'react';
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
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        if (currentUser) await loadHistory(currentUser.id, supabase);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadHistory = async (userId: string, supabase: any) => {
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setHistory(data || []);
    if (data?.length) setLatestOffer(data[0]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 4);
      setSelectedFiles(files);
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0 || !user) return;
    setUploading(true);
    setChatMessages([{ type: 'system', text: `Processing ${selectedFiles.length} file(s)...` }]);

    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await res.json();

      let detectedLender = 'Unknown Lender';
      if (result.crewResponse) {
        const text = result.crewResponse.toLowerCase();
        if (text.includes('citi')) detectedLender = 'Citi';
        else if (text.includes('capital one')) detectedLender = 'Capital One';
        else if (text.includes('figure')) detectedLender = 'Figure';
      }

      const lines = (result.crewResponse || "The Crew responded.").split('\n').filter((l: string) => l.trim().length > 5);
      const crewMessages = lines.map((line: string) => {
        let clean = line.trim().replace(/^(Ledger|Shade|Spark|Clara):\s*/i, '');
        let type = 'spark';
        const lower = line.toLowerCase();
        if (lower.startsWith('ledger')) type = 'ledger';
        else if (lower.startsWith('shade')) type = 'shade';
        else if (lower.startsWith('clara')) type = 'clara';
        else if (lower.startsWith('spark')) type = 'spark';
        return { type, text: clean };
      });

      setChatMessages(crewMessages);

      // Add to Previous Offers
      const newOffer = {
        lender: detectedLender,
        file_count: selectedFiles.length,
        created_at: new Date().toISOString(),
        sequence_number: Date.now()
      };
      setHistory(prev => [newOffer, ...prev]);
      setLatestOffer(newOffer);

    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that offer." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || isResponding) return;
    const username = user?.email?.split('@')[0] || 'User';
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

  const getIconPath = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('ledger')) return '/icons/Ledger Icon.png';
    if (t.includes('spark')) return '/icons/Spark Icon.png';
    if (t.includes('shade')) return '/icons/Shade Icon.png';
    if (t.includes('clara')) return '/icons/Clara Icon.png';
    return '/icons/Ledger Icon.png';
  };

  const getUserInitial = () => (user?.email || 'U').charAt(0).toUpperCase();

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
          {/* LEFT: Upload */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
              <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
              <p className="text-amber-700 mb-4">Redact name, address, account numbers with Sharpie before uploading.</p>
              <p className="text-red-600 text-xs font-medium">Large files are automatically compressed.</p>
            </div>

            <input id="fileInput" type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileSelect} />
            <button onClick={() => document.getElementById('fileInput')?.click()} className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800">
              📤 Select Photos or PDF (max 4)
            </button>

            {selectedFiles.length > 0 && (
              <button onClick={analyzeWithCrew} disabled={uploading} className="mt-6 w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50">
                {uploading ? 'Processing...' : 'Send to the Crew →'}
              </button>
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
                    <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
                      {msg.type !== 'user' && <img src={getIconPath(msg.type)} alt={msg.type} className="w-11 h-11 rounded-2xl mt-1 flex-shrink-0" />}
                      {msg.type === 'user' && <div className="w-11 h-11 bg-cyan-600 text-white rounded-2xl flex items-center justify-center font-bold mt-1">{getUserInitial()}</div>}
                      <div className={`p-4 rounded-3xl max-w-[78%] ${msg.type === 'user' ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                        {msg.type === 'user' && <div className="text-xs text-blue-600 mb-1 font-medium">{msg.username}</div>}
                        {msg.type !== 'user' && msg.type !== 'system' && <div className="text-xs text-cyan-600 mb-1 font-medium capitalize">{msg.type}</div>}
                        <div>{msg.text}</div>
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
                    <button onClick={sendUserMessage} disabled={isResponding} className="px-8 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 disabled:opacity-50">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Previous Offers */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
            <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
              {history.length === 0 && <p className="text-gray-400 text-center py-12">No offers yet.<br />Upload your first one!</p>}
              {history.map((offer, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-400 cursor-pointer transition-all">
                  <p className="font-semibold text-lg">{offer.lender || 'Unknown Lender'}</p>
                  <p className="text-sm text-gray-500">#{String(offer.sequence_number || i+1).padStart(6, '0')}</p>
                  <p className="text-xs text-gray-400 mt-1">{offer.file_count || 1} file(s)</p>
                  <p className="text-xs text-gray-400 mt-3">{new Date(offer.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}