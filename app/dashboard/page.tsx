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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("✅ User loaded:", user?.id);
      setUser(user);
      setLoading(false);
      if (user) await loadHistory(user.id);
    };
    init();
  }, []);

  const loadHistory = async (userId: string) => {
    console.log("🔄 Loading history for:", userId);
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error("❌ History load error:", error);
    else console.log("✅ History loaded:", data?.length || 0, "records");

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
      console.log("🚀 Starting upload and insert for", selectedFiles.length, "files");

      for (const file of selectedFiles) {
        const timestamp = Date.now();
        const filePath = `${user.id}/${timestamp}-${file.name}`;
        
        console.log("📤 Uploading file:", filePath);

        const { error: uploadError } = await supabase.storage.from('mail-pieces').upload(filePath, file);
        if (uploadError) console.error("Upload error:", uploadError);

        console.log("💾 Inserting into offers table...");
        const { data: inserted, error: insertError } = await supabase
          .from('offers')
          .insert({
            user_id: user.id,
            file_path: filePath,
            file_name: file.name,
            lender: file.name.split('-')[0] || 'Unknown',
            sequence_number: timestamp
          })
          .select()
          .single();

        if (insertError) {
          console.error("❌ INSERT FAILED:", insertError);
        } else {
          console.log("✅ Successfully inserted:", inserted?.id);
        }
      }

      // Run analysis
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
      console.error("💥 Main error:", err);
      setChatMessages([{ type: 'system', text: "Sorry, I had trouble analyzing that piece." }]);
    }

    setSelectedFiles([]);
    setUploading(false);
  };

  // ... rest of your functions (loadPastOffer, getIconPath) stay the same ...

  const loadPastOffer = async (offer: any) => {
    setChatMessages([{ type: 'system', text: `Re-analyzing ${offer.file_name}...` }]);

    try {
      const { data: fileData } = await supabase.storage.from('mail-pieces').download(offer.file_path);
      if (!fileData) throw new Error("File not found");

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
      {/* Your full layout JSX remains the same as before */}
      {/* ... paste the full return statement from my previous full file ... */}
    </div>
  );
}