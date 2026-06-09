'use client';

import { useState } from 'react';
import Link from 'next/link';

const blogPosts = [
  {
    id: 1,
    number: "Blog 1",
    title: "Introducing the OfferCrew: Your New Favorite Financial Junk Mail Sidekicks",
    date: "June 9, 2026",
    content: `The OfferCrew has entered the chat.

Ledger:  
Good day. I’m Ledger, the analytical core of the Crew. I break down the numbers, calculate real value, assign Offer Scores out of 10, and deliver the final structured summary on every piece of mail. If there’s math, fine print, or fine print hiding in the math — I’ve got it.

Shade:  
And I’m Shade. I’m here to call out the nonsense. The predatory APR tricks, the “as low as” bait-and-switch garbage, the way they bury the gotchas in 8-point font. If a lender is trying to screw you politely, I’ll be the one laughing while I point it out.

Spark:  
YO! What’s up, mail victims?! I’m Spark — your friendly neighborhood chaos bot! I turn boring offers into comedy roasts. Balance transfer? More like “balance disaster” if you miss the fine print! Let’s make this fun before Ledger kills the vibe with spreadsheets.

Clara:  
Hi everyone, I’m Clara. I’m here to explain everything in plain, friendly English. Whether it’s intro rates, balance transfer fees, HELOCs, or what “pre-approved” actually means, I’ve got your back. No judgment, just clear explanations so you can make smart choices.

Ledger:  
Together we form the OfferCrew. Our mission is simple: take the confusing, expensive world of consumer lending direct mail and make it entertaining, educational, and actually useful.

Shade:
Because let’s be honest — these lenders spend billions sending you fancy-looking letters designed to look like great deals. Someone needs to read the fine print so you don’t have to.

Spark:
And someone needs to make fun of it while we’re at it! Otherwise it’s just sad.

Clara:
Exactly. We want you to feel informed and entertained. That’s the OfferCrew difference.

Ledger:
Here’s how it works: Take photos of your mail — ideally the envelope, front and back of the main letter, and the Schumer box or key terms page (up to 4 images for now). Upload them here, and we’ll all react in real time with banter, explanations, roasts, and my final Offer Score.
You can even ask us follow-up questions about any offer, or have us compare multiple pieces you’ve uploaded.

Shade:
We’re building something bigger too. Every piece you upload helps us create the most comprehensive dataset of real consumer lending mail in existence. That data will eventually power better tools for everyone.

Spark:
But mostly we just want to make you laugh while you dodge financial landmines.

Clara:
And help you actually understand what you’re being offered.

Ledger:
So go ahead — dig out that stack of offers that’s been sitting on your counter. Scan them. Upload them. Let us roast them.
We’re ready when you are.


The Crew:  
See you in the chat.`
  }
  // Add more blog posts here later
];

export default function Blog() {
  const [selectedPost, setSelectedPost] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
          <Link href="/dashboard" className="text-cyan-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold text-center mb-4">Blog</h1>
        <p className="text-center text-gray-600 text-xl mb-12">Scripts from the OfferCrew</p>

        <div className="flex gap-10">
          {/* Left: Content Viewer */}
          <div className="flex-1">
            {selectedPost ? (
              <div className="bg-white rounded-3xl p-12 shadow-sm prose prose-lg max-w-none">
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="mb-8 flex items-center gap-2 text-cyan-600 hover:underline"
                >
                  ← Back to All Posts
                </button>
                
                <h2 className="text-4xl font-bold mb-2">{selectedPost.title}</h2>
                <p className="text-gray-500 mb-10">{selectedPost.date} • {selectedPost.number}</p>
                
                <div className="whitespace-pre-wrap leading-relaxed text-lg">
                  {selectedPost.content}
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-400 text-2xl border-2 border-dashed rounded-3xl">
                Select a post from the right →
              </div>
            )}
          </div>

          {/* Right: Blog List */}
          <div className="w-96 flex-shrink-0">
            <div className="sticky top-8">
              <h2 className="text-2xl font-semibold mb-8">All Posts</h2>
              
              <div className="space-y-6">
                {blogPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-3xl p-6 border border-gray-100 hover:border-cyan-200 transition-all">
                    <span className="text-xs uppercase tracking-widest text-gray-400">{post.number}</span>
                    <h3 className="font-semibold text-xl mt-2 mb-4 leading-tight">{post.title}</h3>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setSelectedPost(post)}
                        className="flex-1 bg-black text-white py-3.5 rounded-2xl font-medium hover:bg-gray-800"
                      >
                        Read Blog
                      </button>
                      <button className="flex-1 bg-gray-200 text-gray-400 py-3.5 rounded-2xl font-medium cursor-not-allowed">
                        Podcast (Soon)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}