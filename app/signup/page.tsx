'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';   // ← Fixed path
import Link from 'next/link';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track page view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Sign Up',
        page_path: '/signup'
      });
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      alert("Account created successfully! Please check your email to confirm your account.");
      window.location.href = '/login';
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2">Join the Crew</h2>
        <p className="text-gray-500 text-center mb-8">Create your account to get started</p>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 6 characters)" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-600 font-medium hover:text-cyan-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}