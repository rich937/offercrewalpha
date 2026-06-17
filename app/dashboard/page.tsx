// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UploadPanel from './components/UploadPanel';
import ChatInterface from './components/ChatInterface';
import PreviousOffers from './components/PreviousOffers';

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

   const handleNewOffer = () => {
  if (user) {
    loadHistory(user.id, getSupabase());
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
        handleNewOffer(); // refresh list
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
    const text = `OfferCrew roast of a ${selectedVideo.lender} offer!`;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      alert(`Link copied! Share on ${platform}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <div className="flex items-center gap-10 text-lg">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={activeTab === 'dashboard' ? 'font-semibold border-b-2 border-black pb-1' : 'text-gray-600 hover:text-black'}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('blog')} 
              className={activeTab === 'blog' ? 'font-semibold border-b-2 border-black pb-1' : 'text-gray-600 hover:text-black'}
            >
              Blog / Podcasts
            </button>
            <button 
              onClick={() => setActiveTab('about')} 
              className={activeTab === 'about' ? 'font-semibold border-b-2 border-black pb-1' : 'text-gray-600 hover:text-black'}
            >
              About
            </button>
          </div>
        </div>
      </nav>

      {activeTab === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 h-[calc(100vh-180px)]">
     <UploadPanel 
  onUploadComplete={handleNewOffer}
  onAnalysisComplete={setChatMessages}   // ← Add this line
  user={user} 
/>
          
          <ChatInterface 
            chatMessages={chatMessages} 
            setChatMessages={setChatMessages}
            userInput={userInput}
            setUserInput={setUserInput}
            isResponding={isResponding}
            setIsResponding={setIsResponding}
            user={user}
          />
          
          <PreviousOffers 
            history={history} 
            onGeneratePodcast={generatePodcast}
            onWatchPodcast={openVideoViewer}
          />
        </div>
      )}

      {/* Floating Video Viewer */}
      {selectedVideo && selectedVideo.podcast_video_url && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold">{selectedVideo.lender} Offer Podcast</h3>
              <button onClick={closeVideoViewer} className="text-4xl leading-none text-gray-400 hover:text-black">×</button>
            </div>
            <video controls autoPlay className="w-full aspect-video" src={selectedVideo.podcast_video_url} />
            <div className="p-5 flex gap-3 flex-wrap bg-gray-50">
              <button onClick={() => shareVideo('twitter')} className="flex-1 py-4 bg-black text-white rounded-2xl font-medium">Share on X</button>
              <button onClick={() => shareVideo('instagram')} className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-medium">Instagram</button>
              <button onClick={() => shareVideo('tiktok')} className="flex-1 py-4 bg-black text-white rounded-2xl font-medium">TikTok</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}