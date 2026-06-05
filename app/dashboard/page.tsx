'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { type: 'system', text: 'The Crew is ready. Upload mail to begin the roast!' }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');

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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 4);
      setSelectedFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).slice(0, 4);
      setSelectedFiles(files);
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setChatMessages([{ type: 'system', text: `Analyzing ${selectedFiles.length} piece(s)...` }]);

    try {
      for (const file of selectedFiles) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        await supabase.storage.from('mail-pieces').upload(filePath, file);

        await supabase.from('offers').insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          lender: 'Pending',
          sequence_number: Date.now()
        });
      }

      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

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

      await loadHistory(user.id);
    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that piece." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  const sendUserMessage = async () => {
    if (!userInput.trim()) return;

    setChatMessages(prev => [...prev, { type: 'user', text: userInput }]);
    const question = userInput;
    setUserInput('');

    // For now, send to Grok for a response from the Crew
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      // In a future version we can make a dedicated chat endpoint
      setChatMessages(prev => [...prev, { type: 'system', text: "The Crew is thinking about your question..." }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { type: 'system', text: "Sorry, I couldn't respond to that right now." }]);
    }
  };

  const loadPastOffer = async (offer: any) => {
    setChatMessages([{ type: 'system', text: `Re-analyzing ${offer.file_name}...` }]);

    try {
      const { data: fileData } = await supabase.storage.from('mail-pieces').download(offer.file_path);
      if (!fileData) throw new Error();

      const file = new File([fileData], offer.file_name, { type: 'image/jpeg' });
      const formData = new FormData();
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
    } catch (e) {
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble re-analyzing that piece." }]);
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

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 h-[calc(100vh-80px)]">
        
        {/* LEFT: Upload */}
        <div className="w-80 flex-shrink-0">
          <h2 className="text-xl font-semibold mb-4">Upload Mail</h2>
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
            <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
            <p className="text-amber-700 mb-4">
              For your protection, please <strong>redact with a black Sharpie</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-700 text-xs">
              <li>Your full name and street address</li>
              <li>Any personal account numbers</li>
            </ul>
            <p className="mt-4 text-amber-700 text-xs">
              <strong>Leave visible:</strong> Offer rates, terms, fine print, company name, and especially the <strong>QR code</strong> — so you can easily respond to the offer later if you want.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-3xl h-80 flex flex-col items-center justify-center bg-white hover:border-cyan-400 transition-colors cursor-pointer"
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('fileInput')?.click()}>
            <div className="text-6xl mb-6">📄</div>
            <p className="text-lg font-medium text-gray-700 mb-1">Drop mail photos here</p>
            <p className="text-gray-500 mb-6">Max 4 images</p>
            <input id="fileInput" type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <button className="px-8 py-3 bg-black text-white rounded-2xl font-medium hover:bg-gray-800">Browse Files</button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-6 text-center">
              <p className="font-medium mb-3">{selectedFiles.length} / 4 file(s) selected</p>
              <button onClick={analyzeWithCrew} disabled={uploading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50">
                {uploading ? 'Analyzing...' : 'Send to the Crew →'}
              </button>
            </div>
          )}
        </div>

        {/* CENTER: Fixed Size Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="text-xl font-semibold mb-4">Crew Reactions</h2>
          <div className="bg-black rounded-[3rem] p-3 shadow-2xl flex-1 flex flex-col" style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-5 text-white">
                <h3 className="font-semibold text-lg">OfferCrew</h3>
              </div>

              {/* Fixed height scrollable chat */}
              <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-6" style={{ maxHeight: '520px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.type === 'system' ? 'justify-center' : 'items-start gap-3'}`}>
                    {msg.type !== 'system' && (
                      <img src={getIconPath(msg.type)} alt={msg.type} className="w-11 h-11 flex-shrink-0 rounded-2xl object-cover shadow-md mt-1" />
                    )}
                    <div className={`p-4 rounded-3xl flex-1 max-w-[78%] ${msg.type === 'system' ? 'bg-gray-100 text-center' : 'bg-white shadow-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Persistent Chat Input Bar */}
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
                    className="px-6 bg-black text-white rounded-2xl font-medium hover:bg-gray-800"
                  >
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
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{offer.lender || 'Mail Piece'}</p>
                    <p className="text-sm text-gray-500">#{String(offer.sequence_number || offer.id).padStart(6, '0')}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  {new Date(offer.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}