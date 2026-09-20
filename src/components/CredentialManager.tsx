"use client";
import { useState, useEffect } from 'react';
import { KeyRound, Plus, Trash2, Save, X, Server, Eye, EyeOff, Loader2 } from 'lucide-react';
import axios from 'axios';

export interface Credential {
  id: string;
  name: string;
  connectionString: string;
}

interface CredentialManagerProps {
  onClose: () => void;
}

export default function CredentialManager({ onClose }: CredentialManagerProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, 'success' | 'error' | null>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ARCHITECT_CREDENTIALS') || '[]');
      setCredentials(stored);
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem('ARCHITECT_CREDENTIALS', JSON.stringify(credentials));
    onClose();
  };

  const addCredential = () => {
    setCredentials([...credentials, { id: `cred_${Date.now()}`, name: 'New DB Connection', connectionString: '' }]);
  };

  const removeCredential = (id: string) => {
    setCredentials(credentials.filter(c => c.id !== id));
  };

  const updateCredential = (id: string, field: 'name' | 'connectionString', val: string) => {
    setCredentials(credentials.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const toggleVisibility = (index: number) => {
    const newVis = new Set(visibleIndexes);
    if (newVis.has(index)) newVis.delete(index);
    else newVis.add(index);
    setVisibleIndexes(newVis);
  };

  const testConnection = async (cred: Credential) => {
    if (!cred.connectionString) return;
    setTestingId(cred.id);
    setTestResult(prev => ({ ...prev, [cred.id]: null }));
    
    try {
      const res = await axios.post('/api/connection-test', { connectionString: cred.connectionString });
      if (res.data.success) {
        setTestResult(prev => ({ ...prev, [cred.id]: 'success' }));
      } else {
        setTestResult(prev => ({ ...prev, [cred.id]: 'error' }));
      }
    } catch (e) {
      setTestResult(prev => ({ ...prev, [cred.id]: 'error' }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-[700px] bg-bg border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-border bg-code-bg">
          <h2 className="text-lg font-bold text-text-h flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-accent" /> Secure Secret Vault
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-6 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-text-muted">
            Manage your database connection strings and credentials securely. These are stored only in your local browser storage and never transmitted outside of your secure execution environment.
          </p>

          <div className="flex flex-col gap-4">
            {credentials.map((c, i) => (
              <div key={c.id} className="flex flex-col gap-2 p-4 bg-code-bg border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    value={c.name}
                    onChange={(e) => updateCredential(c.id, 'name', e.target.value)}
                    placeholder="Connection Name (e.g., Prod Postgres)"
                    className="bg-transparent border-none font-semibold text-text-h focus:outline-none w-1/2"
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => testConnection(c)}
                      disabled={testingId === c.id || !c.connectionString}
                      className="px-3 py-1 bg-bg border border-border rounded text-xs font-medium hover:text-accent disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {testingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                      Test Connection
                    </button>
                    <button onClick={() => removeCredential(c.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="relative flex items-center mt-2">
                  <input 
                    type={visibleIndexes.has(i) ? "text" : "password"}
                    value={c.connectionString}
                    onChange={(e) => updateCredential(c.id, 'connectionString', e.target.value)}
                    placeholder="postgresql://user:pass@localhost:5432/db"
                    className="w-full bg-bg border border-border pl-3 pr-10 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                  />
                  <button 
                    onClick={() => toggleVisibility(i)} 
                    className="absolute right-3 text-text-muted hover:text-text"
                  >
                    {visibleIndexes.has(i) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {testResult[c.id] === 'success' && <div className="text-xs text-green-500 mt-1">Connection successful!</div>}
                {testResult[c.id] === 'error' && <div className="text-xs text-red-500 mt-1">Connection failed. Check your credentials.</div>}
              </div>
            ))}
            
            <button onClick={addCredential} className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-muted hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Credential
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-code-bg flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-bg border border-border text-text rounded-lg hover:bg-code-bg text-sm font-medium">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg hover-bg-lift flex items-center gap-2 text-sm font-medium shadow-glow">
            <Save className="w-4 h-4" /> Save Vault
          </button>
        </div>

      </div>
    </div>
  );
}
