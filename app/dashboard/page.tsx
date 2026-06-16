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
  const [generatingPodcast, setGeneratingPodcast] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

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

  const getIconPath = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('ledger')) return '/icons/Ledger Icon.png';
    if (t.includes('spark')) return '/icons/Spark Icon.png';
    if (t.includes('shade')) return '/icons/Shade Icon.png';
    if (t.includes('clara')) return '/icons/Clara Icon.png';
    return '/icons/Ledger Icon.png';
  };

  const analyzeWithCrew = async (filesToUse?: File[]) => {
    const files = filesToUse || selectedFiles;
    if (files.length === 0 || !user) return;

    setUploading(true);
    setChatMessages([{ type: 'system', text: `Analyzing ${files.length} file(s)...` }]);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await res.json();

      // Robust JSON parsing
      let messagesToShow: any[] = [];
      try {
        let raw = result.crewResponse || "{}";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) raw = jsonMatch[0];
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.messages)) {
          messagesToShow = parsed.messages.map((item: any) => ({
            type: (item.speaker || 'system').toLowerCase(),
            text: (item.text || String(item)).trim()
          }));
        } else if (Array.isArray(parsed.crew_conversation)) {
          messagesToShow = parsed.crew_conversation.map((item: any) => ({
            type: (item.speaker || 'system').toLowerCase(),
            text: (item.text || String(item)).trim()
          }));
        }
      } catch (e) {
        console.warn("JSON parse failed, using raw text", e);
        messagesToShow = [{ type: 'system', text: result.crewResponse || "The Crew responded." }];
      }

      setChatMessages(messagesToShow.length > 0 ? messagesToShow : [{ type: 'system', text: result.crewResponse || "The Crew responded." }]);

      // Refresh history so new offer appears immediately
      const supabase = getSupabase();
      await loadHistory(user.id, supabase);

    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that offer." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || isResponding) return;
    const message = userInput.trim();
    setChatMessages(prev => [...prev, { type: 'user', text: message }]);
    setUserInput('');
    setIsResponding(true);

    // Placeholder - replace with real /api/chat call later
    setTimeout(() => {
      setChatMessages(prev => [...prev, { type: 'clara', text: "Great question! Let me check the details of this offer..." }]);
      setIsResponding(false);
    }, 1500);
  };

  const reAnalyzeOffer = async (offer: any) => {
    if (!offer.file_paths || offer.file_paths.length === 0) {
      alert("No files available for this offer.");
      return;
    }
    // For now just reload the last analysis
    setChatMessages([{ type: 'system', text: `Re-analyzing ${offer.lender} offer...` }]);
    // TODO: Call analyze with stored files if needed
  };

  const generatePodcast = async (offer: any) => {
    if (!offer.id) return alert("No offer ID found");
    setGeneratingPodcast(offer.id);

    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: offer.id })
      });
      const data = await res.json();

      if (data.success) {
        alert(`🎙️ Podcast started for ${offer.lender}!`);
        const supabase = getSupabase();
        await loadHistory(user.id, supabase);
      } else {
        alert('Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error generating podcast');
    } finally {
      setGeneratingPodcast(null);
    }
  };

  const openVideoViewer = (offer: any) => {
    if (offer.podcast_video_url) {
      setSelectedVideo(offer);
    } else {
      alert("Video is still generating. Try again in a moment.");
    }
  };

  const closeVideoViewer = () => setSelectedVideo(null);

  const shareVideo = (platform: string) => {
    if (!selectedVideo?.podcast_video_url) return;
    const url = selectedVideo.podcast_video_url;
    const text = `Check out this OfferCrew roast of a ${selectedVideo.lender} offer!`;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      alert(`Link copied! Share on ${platform}`);
    }
  };

  // File handling functions (stubbed - replace with your full versions if needed)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <div className="flex items-center gap-8 text-gray-700">
            <button onClick={() => setActiveTab('dashboard')} className={`font-medium ${activeTab === 'dashboard' ? 'text-black' : 'hover:text-black'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('blog')} className={`font-medium ${activeTab === 'blog' ? 'text-black' : 'hover:text-black'}`}>Blog</button>
            <button onClick={() => setActiveTab('about')} className={`font-medium ${activeTab === 'about' ? 'text-black' : 'hover:text-black'}`}>About</button>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-6 py-2 text-gray-700 hover:text-black font-medium">Log In</Link>
            <Link href="/signup" className="px-6 py-2 bg-black text-white rounded-2xl font-medium hover:bg-gray-800">Sign Up</Link>
          </div>
        </div>
      </nav>

      {activeTab === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 h-[calc(100vh-180px)]">
          {/* Upload Column */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-2xl font-semibold mb-6">Upload New Offer</h2>
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
              <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
              <p className="text-amber-700">Redact your name, address, and any codes with a Sharpie before uploading.</p>
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
                onClick={() => analyzeWithCrew()} 
                disabled={uploading} 
                className="mt-6 w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50"
              >
                {uploading ? 'Analyzing with the Crew...' : 'Send to the Crew →'}
              </button>
            )}
          </div>

          {/* Chat / Text Interface */}
          <div className="flex-1 flex flex-col bg-white rounded-3xl shadow border border-gray-100 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
              <img src="/logo.png" alt="OfferCrew" className="h-8" />
              <span className="font-semibold">Crew Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6" id="chat-window">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type !== 'user' && (
                    <img src={getIconPath(msg.type)} alt="" className="w-10 h-10 mr-3 flex-shrink-0" />
                  )}
                  <div className={`max-w-[75%] ${msg.type === 'user' ? 'bg-black text-white' : 'bg-gray-100'} rounded-3xl px-5 py-4`}>
                    {msg.type !== 'user' && <div className="font-semibold text-cyan-600 mb-1">{msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}</div>}
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {isResponding && <div className="text-gray-400">Crew is thinking...</div>}
            </div>
            <div className="p-4 border-t bg-white flex gap-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
                placeholder="Ask the Crew a question about this offer..."
                className="flex-1 border border-gray-300 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button onClick={sendUserMessage} disabled={isResponding} className="px-8 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 disabled:opacity-50">
                Send
              </button>
            </div>
          </div>

          {/* Previous Offers */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-2xl font-semibold mb-6">Previous Offers</h2>
            <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
              {history.length === 0 && (
                <p className="text-gray-400 text-center py-12">No offers yet.<br />Upload your first one!</p>
              )}
              {history.map((offer, i) => (
                <div 
                  key={i} 
                  onClick={() => reAnalyzeOffer(offer)}
                  className="bg-white border border-gray-200 rounded-3xl p-6 hover:border-cyan-500 hover:shadow-md cursor-pointer transition-all"
                >
                  <p className="font-semibold text-xl">{offer.lender}</p>
                  <p className="text-sm text-gray-500 mt-1">#{String(offer.sequence_number || i + 1).padStart(6, '0')}</p>
                  <p className="text-xs text-gray-400 mt-2">{offer.file_count || 1} file(s) • {new Date(offer.created_at).toLocaleDateString()}</p>

                  <div className="mt-5 flex gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); generatePodcast(offer); }}
                      disabled={generatingPodcast === offer.id}
                      className="flex-1 py-3 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:brightness-110 disabled:opacity-50"
                    >
                      {generatingPodcast === offer.id ? "🎙️ Generating..." : "🎙️ Podcast"}
                    </button>
                    {offer.podcast_video_url && (
                      <button onClick={(e) => { e.stopPropagation(); openVideoViewer(offer); }} className="flex-1 py-3 text-sm bg-black text-white rounded-2xl hover:bg-gray-800">
                        ▶ Watch
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Video Viewer */}
      {selectedVideo && selectedVideo.podcast_video_url && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-lg">{selectedVideo.lender} Offer Podcast</h3>
              <button onClick={closeVideoViewer} className="text-4xl leading-none text-gray-400 hover:text-black">×</button>
            </div>
            <video controls autoPlay className="w-full aspect-video" src={selectedVideo.podcast_video_url} />
            <div className="p-5 flex gap-3 flex-wrap bg-gray-50">
              <button onClick={() => shareVideo('twitter')} className="flex-1 py-4 bg-black text-white rounded-2xl font-medium">Share on X</button>
              <button onClick={() => shareVideo('instagram')} className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-medium">Instagram</button>
              <button onClick={() => shareVideo('tiktok')} className="flex-1 py-4 bg-black text-white rounded-2xl font-medium">TikTok</button>
              <button onClick={() => shareVideo('youtube')} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-medium">YouTube</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}