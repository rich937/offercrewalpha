// app/dashboard/components/PreviousOffers.tsx
'use client';

interface PreviousOffersProps {
  history: any[];
}

export default function PreviousOffers({ history }: PreviousOffersProps) {
  const reAnalyzeOffer = (offer: any) => {
    console.log("Re-analyzing offer:", offer);
    // This will be wired up to the parent later if needed
    alert(`Re-analyzing ${offer.lender}... (connect to analyzeWithCrew in parent)`);
  };

  const generatePodcast = (offer: any) => {
    alert(`Generating podcast for ${offer.lender}... (will connect to /api/podcast)`);
  };

  return (
    <div className="w-80 flex-shrink-0">
      <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
      <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
        {history.length === 0 && (
          <p className="text-gray-400 text-center py-12">
            No offers yet.<br />Upload your first one!
          </p>
        )}

        {history.map((offer, i) => (
          <div 
            key={i} 
            onClick={() => reAnalyzeOffer(offer)}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-400 cursor-pointer transition-all"
          >
            <p className="font-semibold text-lg">{offer.lender}</p>
            <p className="text-sm text-gray-500">
              #{String(offer.sequence_number || i + 1).padStart(6, '0')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {offer.file_count || 1} file(s)
            </p>

            <div className="mt-4 flex gap-3">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  generatePodcast(offer); 
                }}
                className="flex-1 py-2.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:brightness-110"
              >
                🎙️ Podcast
              </button>
              {offer.podcast_video_url && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    // openVideoViewer will be handled in parent
                    alert("Opening video player...");
                  }} 
                  className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-gray-800"
                >
                  ▶ Watch
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}