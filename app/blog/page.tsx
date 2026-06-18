// app/blog/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

const blogPosts = [
  { id: 1, title: "How to Find the Best Credit Card in 2026", author: "Ledger", excerpt: "Stop falling for teaser rates. Here's what actually matters when choosing a credit card right now.", date: "Jun 18, 2026", readTime: "8 min", category: "Credit Cards" },
  { id: 2, title: "What Is a HELOC and Should You Get One?", author: "Clara", excerpt: "A patient breakdown of Home Equity Lines of Credit — the pros, cons, and when it actually makes sense.", date: "Jun 17, 2026", readTime: "10 min", category: "Home Loans" },
  { id: 3, title: "How Do Airline Credit Cards Really Work?", author: "Spark", excerpt: "The energetic truth about points, annual fees, and whether those 'free' flights are actually free.", date: "Jun 16, 2026", readTime: "7 min", category: "Rewards" },
  { id: 4, title: "Personal Loans vs. Credit Cards: Which Is Cheaper Right Now?", author: "Ledger", excerpt: "Comparing the real cost of borrowing in today's interest rate environment.", date: "Jun 15, 2026", readTime: "6 min", category: "Borrowing" },
  { id: 5, title: "Debt Consolidation Offers: Are They Saving You Money or Tricking You?", author: "Shade", excerpt: "The sarcastic truth about those debt consolidation mail offers.", date: "Jun 14, 2026", readTime: "9 min", category: "Debt" },
  { id: 6, title: "What to Do When You Get a 0% APR Offer in the Mail", author: "Clara", excerpt: "How to evaluate balance transfer and 0% APR offers without getting burned.", date: "Jun 13, 2026", readTime: "8 min", category: "Credit Cards" },
  { id: 7, title: "Home Equity Loans vs HELOCs: Which One Makes More Sense in 2026?", author: "Ledger", excerpt: "Fixed vs variable rates — a clear comparison for homeowners.", date: "Jun 12, 2026", readTime: "7 min", category: "Home Loans" },
  { id: 8, title: "Balance Transfer Credit Cards – The Complete 2026 Guide", author: "Clara", excerpt: "When they save you money and when they’re a trap.", date: "Jun 11, 2026", readTime: "9 min", category: "Credit Cards" },
  { id: 9, title: "How to Read the Fine Print on Direct Mail Loan Offers (and Not Get Burned)", author: "Shade", excerpt: "A no-BS guide to spotting the tricks in lending mail.", date: "Jun 10, 2026", readTime: "6 min", category: "Lending" },
  { id: 10, title: "Cash-Back vs. Points vs. Miles: Which Rewards Card Should You Actually Get?", author: "Spark", excerpt: "Let’s settle this once and for all with real talk.", date: "Jun 9, 2026", readTime: "8 min", category: "Rewards" },
];

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = blogPosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">The OfferCrew Blog</h1>
        <p className="text-xl text-gray-600">Smart money talk from Ledger, Clara, Shade & Spark</p>
      </div>

      <div className="mb-10 max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search blog posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-6 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-400 text-lg"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map(post => (
          <Link href={`/blog/${post.id}`} key={post.id} className="group">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 h-full hover:border-cyan-400 hover:shadow-xl transition-all">
              <div className="text-xs uppercase tracking-widest text-cyan-600 mb-2">{post.category}</div>
              <h3 className="text-2xl font-semibold mb-4 group-hover:text-cyan-600 transition-colors">{post.title}</h3>
              <p className="text-gray-600 mb-8 line-clamp-3">{post.excerpt}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>By <span className="font-medium text-gray-900">{post.author}</span></div>
                <div>{post.readTime}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}