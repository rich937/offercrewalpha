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
  const [isResponding, setIsResponding] = useState(false);

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
    setChatMessages(prev => [...prev, { type: 'system', text: `Analyzing ${selectedFiles.length} piece(s)...` }]);

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
      setChatMessages(prev => [...prev, { type: 'system', text: "Sorry, I had trouble analyzing that piece." }]);
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
      username: username 
    }]);

    const question = userInput;
    setUserInput('');
    setIsResponding(true);

    try {
      // Call the analyze endpoint with the question (it will use Reference Guide + Bible)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: question,
          context: "Previous conversation context" 
        })
      });

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
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { type: 'clara', text: "I'm sorry, I'm having trouble responding right now. Can you try again?" }]);
    }

    setIsResponding(false);
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

  const getUserInitial = () => {
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

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 h-[calc(100vh-80px)]">
        
        {/* LEFT: Upload (same as before) */}
        <div className="w-80 flex-shrink-0">
          {/* ... your existing upload UI with privacy guidance ... */}
        </div>

        {/* CENTER: Fixed Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="text-xl font-semibold mb-4">Crew Chat</h2>
          <div className="bg-black rounded-[3rem] p-3 shadow-2xl flex-1 flex flex-col" style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-5 text-white">
                <h3 className="font-semibold text-lg">OfferCrew</h3>
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
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Persistent Input */}
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

        {/* RIGHT: Previous Offers (same as before) */}
        <div className="w-80 flex-shrink-0">
          {/* ... your history panel ... */}
        </div>
      </div>
    </div>
  );
}