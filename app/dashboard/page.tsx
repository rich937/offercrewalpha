'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      console.log("📸 File selected:", e.target.files[0].name);
      alert("File selected! In the next version, this will trigger the Crew roast.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      alert("File dropped! Ready for Crew analysis.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
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
        
        {/* Left: Phone Chat Interface */}
        <div className="w-96 flex-shrink-0">
          <div className="bg-black rounded-[3rem] p-3 shadow-2xl mx-auto" style={{ maxWidth: '380px' }}>
            <div className="bg-white rounded-[2.5rem] h-[680px] flex flex-col overflow-hidden">
              
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-4 text-white">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">OfferCrew</h3>
                  <div className="flex gap-2">
                    {/* Crew Icons - matching your Bible style */}
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">L</div>
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">S</div>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">H</div>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">C</div>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4 text-sm">
                <div className="text-center text-gray-400 py-12">
                  The Crew is ready.<br />Upload a piece of mail to begin!
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t p-4 bg-white">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Upload Area */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-8">Upload Your Mail</h1>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-3xl h-96 flex flex-col items-center justify-center bg-white hover:border-cyan-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 text-4xl">
              📄
            </div>
            <p className="text-xl font-medium text-gray-700 mb-2">Drop your mail piece here</p>
            <p className="text-gray-500 mb-6">or click to browse</p>
            
            <input 
              id="fileInput"
              type="file" 
              accept="image/*,.pdf" 
              className="hidden"
              onChange={handleFileSelect}
            />

            <button className="px-8 py-3 bg-black text-white rounded-2xl font-medium hover:bg-gray-800">
              Browse Files
            </button>
            
            <p className="text-xs text-gray-400 mt-6">JPG, PNG, PDF • Max 10MB</p>
          </div>

          {selectedFile && (
            <p className="mt-4 text-center text-green-600">
              Selected: {selectedFile.name} — Ready for Crew analysis!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}