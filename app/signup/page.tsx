'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export default function SignUp() {
  // Track page view in Google Analytics
  useEffect(() => {
    const trackPageView = () => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_title: 'Sign Up',
          page_location: window.location.href,
          page_path: '/signup'
        });
      }
    };

    trackPageView();

    // Backup call in case gtag loads late
    const timeout = setTimeout(trackPageView, 1500);
    return () => clearTimeout(timeout);
  }, []);

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

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input 
              type="text" 
              placeholder="Choose a username" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              placeholder="you@email.com" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              placeholder="Create a password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <input 
              type="password" 
              placeholder="Confirm your password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition"
          >
            Create Account
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-cyan-600 font-medium hover:text-cyan-700">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}