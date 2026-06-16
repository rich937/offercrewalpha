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

  const sendUserMessage = async () => {
    if (!userInput.trim() || isResponding) return;
    const message = userInput.trim();
    setChatMessages(prev => [...prev, { type: 'user', text: message }]);
    setUserInput('');
    setIsResponding(true);

    setTimeout(() => {
      setChatMessages(prev => [...prev, { type: 'clara', text: "That's a great question about this offer..." }]);
      setIsResponding(false);
    }, 1200);
  };

  const compressImage = (file: File): Promise<File> => { /* your existing function */ return Promise.resolve(file); };
  const convertPdfToImages = async (file: File): Promise<File[]> => { /* your existing function */ return []; };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { /* your existing function */ };

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

      // Parse messages properly
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
        }
      } catch (e) {
        console.warn("JSON parse failed", e);
      }

      setChatMessages(messagesToShow.length > 0 ? messagesToShow : [{ type: 'system', text: result.crewResponse || "The Crew responded." }]);

      // Reload history so new offer appears
      const supabase = getSupabase();
      await loadHistory(user.id, supabase);

    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that offer." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

   const reAnalyzeOffer = async (offer: any) => {
    if (!offer.file_paths || offer.file_paths.length === 0) {
      setChatMessages([{ type: 'system', text: "No images found for this offer." }]);
      return;
    }

    setUploading(true);
    setChatMessages([{ type: 'system', text: `Re-analyzing ${offer.lender} offer...` }]);

    try {
      const supabase = getSupabase();
      const processedFiles: File[] = [];

      for (const path of offer.file_paths) {
        const { data, error } = await supabase.storage
          .from('mail-pieces')
          .download(path);

        if (error) {
          console.error('Download error:', error);
          continue;
        }

        const file = new File([data], path.split('/').pop() || 'image.jpg', { 
          type: 'image/jpeg' 
        });
        processedFiles.push(file);
      }

      if (processedFiles.length === 0) {
        setChatMessages([{ type: 'system', text: "Could not load images for this offer." }]);
        return;
      }

      await analyzeWithCrew(processedFiles);

    } catch (err) {
      console.error(err);
      setChatMessages([{ type: 'system', text: "Sorry, could not re-analyze this offer." }]);
    } finally {
      setUploading(false);
    }
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
        alert(`🎙️ Podcast generation started for ${offer.lender}!`);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation and Tabs - same as before */}

      {activeTab === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 h-[calc(100vh-180px)]">
          {/* Upload Column */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-6">Upload New Offer</h2>
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
              <p className="font-semibold text-amber-800 mb-3">🔒 Privacy First</p>
              <p className="text-amber-700">Redact name, address, and codes with a Sharpie before uploading.</p>
            </div>
            <input id="fileInput" type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileSelect} />
            <button onClick={() => document.getElementById('fileInput')?.click()} className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800">
              📤 Select Photos or PDF (max 4)
            </button>
            {selectedFiles.length > 0 && (
              <button onClick={() => analyzeWithCrew()} disabled={uploading} className="mt-6 w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold hover:brightness-110 disabled:opacity-50">
                {uploading ? 'Analyzing...' : 'Send to the Crew →'}
              </button>
            )}
          </div>

          {/* Chat Column */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Your chat UI - keep as is */}
          </div>

          {/* Previous Offers */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
            <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
              {history.length === 0 && (
                <p className="text-gray-400 text-center py-12">No offers yet.<br />Upload your first one!</p>
              )}
              {history.map((offer, i) => (
                <div key={i} onClick={() => reAnalyzeOffer(offer)} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-500 hover:shadow-md cursor-pointer transition-all">
                  <p className="font-semibold text-lg">{offer.lender}</p>
                  <p className="text-sm text-gray-500">#{String(offer.sequence_number || i+1).padStart(6, '0')}</p>
                  <p className="text-xs text-gray-400 mt-1">{offer.file_count || 1} file(s)</p>
                  
                  <button onClick={(e) => { e.stopPropagation(); generatePodcast(offer); }} disabled={generatingPodcast === offer.id} className="mt-3 w-full py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:brightness-110 disabled:opacity-50">
                    {generatingPodcast === offer.id ? "🎙️ Generating..." : "🎙️ Generate Podcast"}
                  </button>

                  {offer.podcast_video_url && (
                    <button onClick={(e) => { e.stopPropagation(); openVideoViewer(offer); }} className="mt-2 w-full py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800">
                      ▶ Watch Podcast
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Video Viewer - same as before */}
      {selectedVideo && selectedVideo.podcast_video_url && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold">{selectedVideo.lender} Offer Podcast</h3>
              <button onClick={closeVideoViewer} className="text-3xl leading-none hover:text-gray-400">×</button>
            </div>
            <video controls autoPlay className="w-full" src={selectedVideo.podcast_video_url}>
              Your browser does not support the video tag.
            </video>
            <div className="p-4 flex gap-3 flex-wrap bg-gray-50">
              <button onClick={() => shareVideo('twitter')} className="flex-1 py-3 bg-black text-white rounded-2xl">Share on X</button>
              <button onClick={() => shareVideo('instagram')} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl">Share on Instagram</button>
              <button onClick={() => shareVideo('tiktok')} className="flex-1 py-3 bg-black text-white rounded-2xl">Share on TikTok</button>
              <button onClick={() => shareVideo('youtube')} className="flex-1 py-3 bg-red-600 text-white rounded-2xl">Share on YouTube</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}