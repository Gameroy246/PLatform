"use client";
import { useState, useEffect } from 'react';
import Canvas from "@/components/Canvas";
import ProjectDashboard from "@/components/ProjectDashboard";
import LoginScreen from "@/components/LoginScreen";
import AdminPanel from "@/components/AdminPanel";
import { ReactFlowProvider } from '@xyflow/react';
import { Loader2 } from 'lucide-react';

type ViewState = 'login' | 'dashboard' | 'canvas' | 'admin';

export default function SecureWorkspace() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [activeView, setActiveView] = useState<ViewState>('login');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAuthStatus('authenticated');
          setUserRole(data.user.role);
          setActiveView('dashboard');
        } else {
          setAuthStatus('unauthenticated');
          setActiveView('login');
        }
      })
      .catch(() => {
        setAuthStatus('unauthenticated');
        setActiveView('login');
      });
  }, []);

  if (authStatus === 'loading') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (activeView === 'login' || authStatus === 'unauthenticated') {
    return (
      <LoginScreen onLoginSuccess={(role: string) => {
        setAuthStatus('authenticated');
        setUserRole(role);
        setActiveView('dashboard');
      }} />
    );
  }

  if (activeView === 'admin') {
    return (
      <AdminPanel onBack={() => setActiveView('dashboard')} />
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col relative">
      {activeView === 'dashboard' ? (
        <ProjectDashboard onOpenProject={(id: string) => {
          setActiveProjectId(id);
          setActiveView('canvas');
        }} />
      ) : (
        <ReactFlowProvider>
          <Canvas 
            projectId={activeProjectId} 
            onBack={() => setActiveView('dashboard')} 
            onOpenAdmin={() => setActiveView('admin')}
            onLogout={() => {
              setAuthStatus('unauthenticated');
              setActiveView('login');
            }}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
}
