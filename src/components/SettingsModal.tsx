"use client";
import { useState } from 'react';
import { Shield, Key, Users, Settings } from 'lucide-react';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'secrets' | 'team'>('secrets');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="w-[800px] h-[600px] bg-bg border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border bg-code-bg flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-h flex items-center gap-2"><Settings className="w-5 h-5 text-accent" /> Workspace Settings</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-h transition-colors">Close</button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-1/4 border-r border-border bg-code-bg p-4 flex flex-col gap-2">
            <button 
              onClick={() => setTab('secrets')} 
              className={`flex items-center gap-2 p-2 rounded text-sm font-medium transition-colors ${tab === 'secrets' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text hover:bg-bg'}`}
            >
              <Key className="w-4 h-4" /> Secret Vault
            </button>
            <button 
              onClick={() => setTab('team')} 
              className={`flex items-center gap-2 p-2 rounded text-sm font-medium transition-colors ${tab === 'team' ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text hover:bg-bg'}`}
            >
              <Users className="w-4 h-4" /> Team (RBAC)
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            {tab === 'secrets' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-text-h">Credential Vault</h3>
                <p className="text-sm text-text-muted">Store encrypted environment variables and connection strings for use in pipelines.</p>
                <div className="border border-border rounded bg-code-bg p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm text-text-h">PROD_DB_URL</div>
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded">Encrypted</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm text-text-h">AWS_ACCESS_KEY</div>
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded">Encrypted</span>
                  </div>
                  <button className="self-start mt-4 px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent/90 transition-colors">
                    + Add Secret
                  </button>
                </div>
              </div>
            )}
            
            {tab === 'team' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-text-h">Role-Based Access Control</h3>
                <p className="text-sm text-text-muted">Manage workspace members and their pipeline permissions.</p>
                <div className="border border-border rounded bg-code-bg p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <div className="text-sm font-bold text-text-h">Alex Smith</div>
                      <div className="text-xs text-text-muted">alex@example.com</div>
                    </div>
                    <select className="bg-bg border border-border p-1 rounded text-xs text-text">
                      <option>Admin</option>
                      <option>Editor</option>
                      <option>Viewer</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <div className="text-sm font-bold text-text-h">Service Account Worker</div>
                      <div className="text-xs text-text-muted">bot@example.com</div>
                    </div>
                    <select className="bg-bg border border-border p-1 rounded text-xs text-text">
                      <option>Executor Only</option>
                    </select>
                  </div>
                  <button className="self-start mt-4 px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent/90 transition-colors">
                    + Invite Member
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
