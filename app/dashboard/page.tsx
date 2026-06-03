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
        {/* Main Upload Area */}
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

        {/* Sidebar */}
        <div className="w-96 bg-white rounded-3xl p-6 h-fit">
          <h2 className="font-semibold text-lg mb-6">Recent Uploads</h2>
          
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center mb-4 text-3xl">
              📪
            </div>
            <p className="font-medium text-gray-600 mb-1">No uploads yet</p>
            <p className="text-sm text-gray-500">Your uploaded mail pieces and Crew reactions will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}