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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (!user) window.location.href = '/login';
    };
    getUser();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('mail-pieces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setHistory(data || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) setSelectedFiles(Array.from(e.dataTransfer.files));
  };

  const analyzeFile = async (filePath: string, displayName: string) => {
    setChatMessages([{ type: 'system', text: `Re-analyzing ${displayName}...` }]);

    try {
      const { data: fileData } = await supabase.storage.from('mail-pieces').download(filePath);
      if (!fileData) throw new Error("File not found");

      const file = new File([fileData], displayName, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.crewResponse) {
        const lines = result.crewResponse.split('\n').filter((line: string) => line.trim().length > 8);
        const crewMessages = lines.map((line: string, i: number) => ({
          type: ['spark', 'shade', 'clara', 'ledger'][i % 4],
          text: line.trim()
        }));

        setChatMessages(crewMessages);
      }
    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble re-analyzing that piece." }]);
    }
  };

  const analyzeWithCrew = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setChatMessages(prev => [...prev, { type: 'system', text: `Analyzing ${selectedFiles.length} piece(s)...` }]);

    try {
      for (const file of selectedFiles) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        await supabase.storage.from('mail-pieces').upload(fileName, file);
      }

      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.crewResponse) {
        const lines = result.crewResponse.split('\n').filter((line: string) => line.trim().length > 8);
        const crewMessages = lines.map((line: string, i: number) => ({
          type: ['spark', 'shade', 'clara', 'ledger'][i % 4],
          text: line.trim()
        }));

        setChatMessages(crewMessages);
      }

      loadHistory(); // Refresh history
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { type: 'system', text: "Sorry, I had trouble analyzing that piece." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
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
          <h2 className="text-xl font-semibold mb-6">Upload Mail</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-3xl h-80 flex flex-col items-center justify-center bg-white hover:border-cyan-400 transition-colors cursor-pointer"
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('fileInput')?.click()}>
            <div className="text-6xl mb-6">📄</div>
            <p className="text-lg font-medium text-gray-700 mb-2">Drop mail here</p>
            <p className="text-gray-500 mb-8">or click to browse</p>
            <input id="fileInput" type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <button className="px-8 py-3 bg-black text-white rounded-2xl font-medium hover:bg-gray-800">Browse Files</button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-6 text-center">
              <p className="font-medium mb-3">{selectedFiles.length} file(s) selected</p>
              <button onClick={analyzeWithCrew} disabled={uploading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50">
                {uploading ? 'Analyzing...' : 'Send to the Crew →'}
              </button>
            </div>
          )}
        </div>

        {/* CENTER: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="text-xl font-semibold mb-4">Crew Reactions</h2>
          <div className="bg-black rounded-[3rem] p-3 shadow-2xl flex-1 flex flex-col" style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-5 text-white">
                <h3 className="font-semibold text-lg">OfferCrew</h3>
              </div>

              <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-6" style={{ maxHeight: '620px' }}>
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
            </div>
          </div>
        </div>

        {/* RIGHT: Previous Offers */}
        <div className="w-80 flex-shrink-0">
          <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '620px' }}>
            {history.length === 0 && (
              <p className="text-gray-400 text-center py-8">No offers yet. Upload your first one!</p>
            )}
            
            {history.map((item, index) => (
              <div 
                key={item.id} 
                onClick={() => analyzeFile(item.file_path, item.file_name)}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-400 cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{item.lender || item.file_name.split('-')[0]}</p>
                    <p className="text-sm text-gray-500">#{String(item.sequence_number || (history.length - index)).padStart(6, '0')}</p>
                  </div>
                  {item.ledger_score && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-600">{item.ledger_score}</div>
                      <div className="text-xs text-gray-500">Ledger Score</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}