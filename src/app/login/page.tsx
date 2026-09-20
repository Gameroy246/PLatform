"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaHash, setCaptchaHash] = useState('');
  
  const [requireOtp, setRequireOtp] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      setCaptchaSvg(data.image);
      setCaptchaHash(data.hash);
      setCaptchaText('');
    } catch (e) {
      console.error("Failed to load captcha", e);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaText, captchaHash, otp })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
         if (data.requireOtp) {
            setRequireOtp(true);
            setLoading(false);
            return;
         }
         throw new Error(data.error || 'Login failed');
      }
      
      if (data.success) {
         window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message);
      fetchCaptcha(); // Refresh captcha on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-code-bg rounded-xl shadow-2xl border border-border p-8">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4 border border-accent/30 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-h mb-2">Architect Enterprise</h1>
          <p className="text-sm text-text-muted text-center">
            Sign in to access secure data pipelines.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {!requireOtp ? (
            <>
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
                    placeholder="admin@architect.local"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex justify-between">
                  <span>Password</span>
                  <a href="/reset-password" className="text-accent hover:underline lowercase normal-case">Forgot password?</a>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Security Check</label>
                <div className="flex items-center gap-3 bg-bg border border-border rounded-lg p-2">
                  <div 
                    className="bg-code-bg rounded overflow-hidden flex-shrink-0 cursor-pointer" 
                    dangerouslySetInnerHTML={{ __html: captchaSvg }} 
                    onClick={fetchCaptcha}
                    title="Click to refresh CAPTCHA"
                  />
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      required
                      value={captchaText}
                      onChange={(e) => setCaptchaText(e.target.value)}
                      className="w-full bg-code-bg border border-border rounded py-1.5 px-3 text-sm text-text focus:outline-none focus:border-accent"
                      placeholder="Enter code"
                      autoComplete="off"
                    />
                  </div>
                  <button type="button" onClick={fetchCaptcha} className="p-1.5 text-text-muted hover:text-accent transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider text-center block mb-4">
                Two-Factor Authentication
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                  className="w-full bg-bg border border-border rounded-lg py-3 pl-10 pr-4 text-center tracking-[0.5em] font-mono text-lg text-text focus:outline-none focus:border-accent transition-colors"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <p className="text-xs text-text-muted text-center mt-2">
                Open your Authenticator app and enter the 6-digit code.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || (!requireOtp && !captchaText)}
            className="w-full mt-4 bg-accent text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {requireOtp ? 'Verify OTP' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
