'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms of Service");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        }
      });

      if (error) throw error;

      alert("Account created successfully! You can now log in.");
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="OfferCrew" className="h-12" />
        </div>
        <h2 className="text-3xl font-bold text-center mb-8">Create Account</h2>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-3 border rounded-2xl" placeholder="rich_1" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-2xl" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-2xl" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-2xl" />
          </div>

          <div className="flex items-start gap-3">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <p className="text-sm text-gray-600">
              I agree to the <Link href="/terms" className="text-cyan-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-cyan-600 hover:underline">Privacy Policy</Link>
            </p>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-cyan-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}