'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);

      if (!user) {
        window.location.href = '/login';
      }
    };

    getUser();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-gray-600">Welcome, <strong>{user?.user_metadata?.username || user?.email}</strong></span>
            <button 
              onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
              className="text-gray-500 hover:text-black"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">
        
        {/* Left Side: Phone-shaped Chat Interface */}
        <div className="w-96">
          <div className="bg-black rounded-[3rem] p-3 shadow-2xl mx-auto" style={{ maxWidth: '380px' }}>
            <div className="bg-white rounded-[2.5rem] h-[680px] flex flex-col overflow-hidden">
              
              {/* Chat Header with Crew Icons */}
              <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-4 text-white">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">OfferCrew Chat</h3>
                  <div className="flex gap-1">
                    <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-xs">L</div>
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-xs">S</div>
                    <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-xs">H</div>
                    <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-xs">C</div>
                  </div>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
                <div className="text-center text-gray-400 text-sm py-8">
                  The Crew is waiting for your first mail piece...
                </div>
              </div>

              {/* Text Input Area */}
              <div className="border-t p-4 bg-white">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message or upload mail..." 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500 text-sm"
                  />
                  <button className="bg-black text-white px-6 rounded-2xl font-medium">
                    Send
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-3">Upload a photo of your mail to start the roast</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Upload Area */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-8">Upload Your Mail</h1>
          
          <div className="border-2 border-dashed border-gray-300 rounded-3xl h-96 flex flex-col items-center justify-center bg-white hover:border-cyan-400 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 text-4xl">
              📄
            </div>
            <p className="text-xl font-medium text-gray-700 mb-2">Drop your mail piece here</p>
            <p className="text-gray-500 mb-6">or</p>
            <button className="px-8 py-3 bg-black text-white rounded-2xl font-medium hover:bg-gray-800">
              Browse Files
            </button>
            <p className="text-xs text-gray-400 mt-6">Supports JPG, PNG, PDF • Max 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}