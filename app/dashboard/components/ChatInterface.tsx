// app/dashboard/components/ChatInterface.tsx
'use client';

import { useState } from 'react';

interface ChatInterfaceProps {
  chatMessages: any[];
  setChatMessages: React.Dispatch<React.SetStateAction<any[]>>;
  userInput: string;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
  isResponding: boolean;
  setIsResponding: React.Dispatch<React.SetStateAction<boolean>>;
  user: any;
}

export default function ChatInterface({
  chatMessages,
  setChatMessages,
  userInput,
  setUserInput,
  isResponding,
  setIsResponding,
  user,
}: ChatInterfaceProps) {

  const getIconPath = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('ledger')) return '/icons/Ledger Icon.png';
    if (t.includes('spark')) return '/icons/Spark Icon.png';
    if (t.includes('shade')) return '/icons/Shade Icon.png';
    if (t.includes('clara')) return '/icons/Clara Icon.png';
    return '/icons/Ledger Icon.png';
  };

  const getUserInitial = () => (user?.email || 'U').charAt(0).toUpperCase();

  const sendUserMessage = async () => {
    if (!userInput.trim() || isResponding) return;

    const username = user?.email?.split('@')[0] || 'You';
    const question = userInput.trim();

    setChatMessages(prev => [...prev, { type: 'user', text: question, username }]);
    setUserInput('');
    setIsResponding(true);

    // Clara's quick response
    setChatMessages(prev => [...prev, { type: 'clara', text: "One sec..." }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: question,
          recentOfferContext: "Current offer context" 
        })
      });

      const data = await res.json();

      let messagesToShow: any[] = [];
      try {
        const jsonMatch = data.crewResponse?.match(/\[[\s\S]*\]/) || data.crewResponse?.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : data.crewResponse;
        const parsed = JSON.parse(jsonStr);

        if (Array.isArray(parsed)) {
          messagesToShow = parsed.map((item: any) => ({
            type: (item.speaker || 'spark').toLowerCase(),
            text: (item.text || String(item)).trim()
          }));
        }
      } catch (e) {
        console.warn("Chat JSON parse failed", e);
      }

      const cleaned = messagesToShow.filter(m => m.text.length > 3);
      if (cleaned.length > 0) {
        setChatMessages(prev => [...prev, ...cleaned]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        type: 'ledger',
        text: "Sorry, the offer doesn't give us enough detail to answer that."
      }]);
    }

    setIsResponding(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="bg-black rounded-[3rem] p-3 shadow-2xl flex-1 flex flex-col" style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-blue-100 p-5 flex items-center justify-center border-b">
            <img src="/logo.png" alt="OfferCrew" className="h-9" />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-6" style={{ maxHeight: '520px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
                {msg.type === 'user' ? (
                  <div className="w-11 h-11 bg-cyan-600 text-white rounded-2xl flex items-center justify-center font-bold mt-1 flex-shrink-0">
                    {getUserInitial()}
                  </div>
                ) : (
                  <img
                    src={getIconPath(msg.type)}
                    alt={msg.type}
                    className="w-11 h-11 rounded-2xl mt-1 flex-shrink-0"
                  />
                )}

                <div className="max-w-[78%]">
                  <div className={`text-sm font-semibold mb-1 px-1 ${msg.type === 'user' ? 'text-right text-cyan-600' : 'text-cyan-600'}`}>
                    {msg.type === 'user' ? (msg.username || 'You') : msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}
                  </div>
                  <div className={`p-4 rounded-3xl shadow-sm ${msg.type === 'user' ? 'bg-blue-100' : 'bg-white'}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isResponding && <div className="text-gray-400 italic">Crew is thinking...</div>}
          </div>

          {/* Input Area */}
          <div className="border-t p-4 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
                placeholder="Ask the Crew a question about this offer..."
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
  );
}