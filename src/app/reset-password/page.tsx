"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, RefreshCw, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';

function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [email, setEmail] = useState(emailParam || '');
  const [token, setToken] = useState(tokenParam || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("If that account exists, a reset link has been printed to the server console (Mock SMTP).");
    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Password successfully reset! You can now log in.");
      setTimeout(() => router.push('/login'), 2000);
    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasToken = !!tokenParam;

  return (
    <>
        <button onClick={() => router.push('/login')} className="mb-6 flex items-center gap-2 text-xs text-text-muted hover:text-text transition-colors">
           <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4 border border-accent/30">
            <KeyRound className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-text-h mb-2">Reset Password</h1>
          <p className="text-sm text-text-muted text-center">
            {hasToken ? "Enter your new password below." : "Enter your email to receive a reset token."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-500 text-sm">
            <span>{success}</span>
          </div>
        )}

        {!hasToken ? (
          <form onSubmit={handleRequestReset} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-2 bg-accent text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFulfillReset} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="email" value={email} readOnly className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text opacity-70 cursor-not-allowed" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-2 bg-accent text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Reset Password"}
            </button>
          </form>
        )}
    </>
  );
}

export default function ResetPasswordPageWrapper() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-code-bg rounded-xl shadow-2xl border border-border p-8">
        <React.Suspense fallback={<div className="text-center text-text-muted">Loading...</div>}>
          <ResetPasswordPage />
        </React.Suspense>
      </div>
    </div>
  );
}
