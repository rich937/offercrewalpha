// app/dashboard/components/PreviousOffers.tsx
'use client';

import { useState, useEffect } from 'react';

interface PreviousOffersProps {
  history: any[];
  onGeneratePodcast: (offer: any) => void;
  onWatchPodcast: (offer: any) => void;
}

export default function PreviousOffers({ history, onGeneratePodcast, onWatchPodcast }: PreviousOffersProps) {
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);
  const [pollingOfferIds, setPollingOfferIds] = useState<Set<string>>(new Set());

  const handleGenerate = async (offer: any) => {
    setLoadingOfferId(offer.id);
    await onGeneratePodcast(offer);
    setLoadingOfferId(null);
    setPollingOfferIds(prev => new Set(prev).add(offer.id)); // Start polling
  };

  // Auto-polling for video readiness
  useEffect(() => {
    if (pollingOfferIds.size === 0) return;

    const interval = setInterval(async () => {
      const stillPolling = new Set(pollingOfferIds);

      for (const offerId of pollingOfferIds) {
        try {
          const res = await fetch(`/api/podcast/status?offerId=${offerId}`);
          const data = await res.json();

          if (data.success && data.videoUrl) {
            stillPolling.delete(offerId);
            // Refresh history to show Watch button
            window.location.reload();
          }
        } catch (e) {
          console.error(e);
        }
      }

      setPollingOfferIds(stillPolling);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [pollingOfferIds]);

  return (
    <div className="w-80 flex-shrink-0">
      <h2 className="text-xl font-semibold mb-6">Previous Offers</h2>
      <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '620px' }}>
        {history.length === 0 && (
          <p className="text-gray-400 text-center py-12">No offers yet.<br />Upload your first one!</p>
        )}

        {history.map((offer, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-cyan-400 cursor-pointer transition-all">
            <p className="font-semibold text-lg">{offer.lender}</p>
            <p className="text-sm text-gray-500">#{String(offer.sequence_number || i + 1).padStart(6, '0')}</p>
            <p className="text-xs text-gray-400 mt-1">{offer.file_count || 1} file(s)</p>

            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => handleGenerate(offer)}
                disabled={loadingOfferId === offer.id || pollingOfferIds.has(offer.id)}
                className="flex-1 py-2.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:brightness-110 disabled:opacity-50"
              >
                {loadingOfferId === offer.id || pollingOfferIds.has(offer.id) ? "🎙️ Generating..." : "🎙️ Generate Podcast"}
              </button>
              
              {offer.podcast_video_url && (
                <button 
                  onClick={() => onWatchPodcast(offer)}
                  className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-gray-800"
                >
                  ▶ Watch Podcast
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}