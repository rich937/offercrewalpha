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
  },

    {
    id: 2,
    number: "Blog 2",
    title: "How Much Debt Is Too Much Debt",
    date: "June 9, 2026",
    content: `The OfferCrew has entered the chat.

    Clara:
Hi everyone! Today we’re tackling one of the biggest questions people have: How much debt is too much? Debt isn’t automatically bad — it can help you buy a home, get an education, or grow a business. But it can also become a heavy burden very quickly.

Spark:
Yeah, like that time you bought a $1,200 grill on a credit card because “it was on sale” and now you’re eating ramen while staring at it in the garage! Classic.

Shade:
Or when the bank sends you another “pre-approved” card right after you finally paid one off. They’re not your friends.

Ledger:
Let’s bring some structure to this. The most important number financial experts watch is your Debt-to-Income Ratio, or DTI.

Clara:
Your DTI is your total monthly debt payments divided by your gross monthly income. For example, if you make $6,000 a month and your total debt payments are $2,500, your DTI is about 42%.


Ledger:
Here are the benchmarks:

Under 36% — Healthy and comfortable.
37–49% — Manageable but you should be careful.
50% or higher — Danger zone. Most of your money is going to debt instead of living.

Shade:
Fifty percent? At that point you’re basically working for the banks. Congrats, you’re their favorite employee.

Spark:
It’s like the bank moved into your house and you’re paying rent… except they also own your soul!

Clara:
Another important metric is the difference between “good debt” and “bad debt.” A mortgage at 6% that builds equity can be smart. Credit card debt at 24% that you roll over every month? That’s toxic.

Ledger:
Context matters a lot. A $300,000 mortgage on a stable $120,000 income is often sustainable. $15,000 in credit card debt on the same income can spiral fast because of the high interest.

Shade:
Especially when you’re only paying the minimum and the balance barely moves. That’s how they get you.

Spark:
Minimum payments are just the bank’s way of saying “thanks for the interest, sucker!”

Clara:
Red flags that your debt has become too much include:

Using credit cards for groceries and gas
Feeling constant anxiety when opening mail
No emergency savings
Your credit score dropping significantly

Ledger:
If your debt is controlling your life instead of serving your goals, it has become too much.

Final Summary from Ledger:
Offer Score: 8/10 for awareness
Debt becomes dangerous when it exceeds 36–40% DTI or when high-interest consumer debt starts growing faster than you can pay it. The goal isn’t zero debt — it’s strategic debt that improves your life while keeping you in control.

Clara:
Review your numbers regularly. Small changes — like paying an extra $200 a month — can make a huge difference over time.

Shade:
And stop opening new credit cards just because they send you a nice letter.

Spark:
Unless it comes with a free pizza. Then maybe.

Ledger:
We’re here whenever you want us to roast your specific debt situation. Just upload the statements.

The Crew
Stay smart out there.`
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