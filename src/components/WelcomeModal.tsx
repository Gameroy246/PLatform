"use client";
import { useState, useEffect } from 'react';
import { LayoutTemplate, PlusCircle, Clock, FolderOpen } from 'lucide-react';

interface WelcomeModalProps {
  onNew: () => void;
  onLoadTemplate: (id: string) => void;
  onOpenFile?: () => void;
  onOpenRecent?: () => void;
}

export default function WelcomeModal({ onNew, onLoadTemplate, onOpenFile, onOpenRecent }: WelcomeModalProps) {
  const [recent, setRecent] = useState<any[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('ARCHITECT_PIPELINE');
    if (saved) {
      setRecent([{ id: '1', name: 'Auto-Saved Workspace', date: new Date().toLocaleDateString() }]);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-[800px] bg-bg border border-border rounded-xl shadow-2xl flex overflow-hidden">
        {/* sidebar */}
        <div className="w-1/3 bg-code-bg border-r border-border p-6 flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-text-h flex items-center gap-2"><div className="w-8 h-8 rounded bg-gradient-to-br from-accent to-purple-600 shadow-glow flex items-center justify-center text-white font-bold">A</div> Architect</h1>
            <p className="text-sm text-text-muted mt-2">Enterprise Data Pipeline Builder</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <button onClick={onNew} className="w-full p-3 rounded-lg bg-accent text-white font-medium hover-bg-lift transition-colors flex items-center gap-3">
              <PlusCircle className="w-5 h-5" /> Blank Pipeline
            </button>
            <button onClick={onOpenFile} className="w-full p-3 rounded-lg bg-bg border border-border text-text hover:bg-code-bg transition-colors flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-accent" /> Open File...
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="w-2/3 p-6 flex flex-col gap-6">
          <div>
             <h2 className="text-lg font-bold text-text-h mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-accent" /> Recent Projects</h2>
             {recent.length === 0 ? (
               <div className="p-8 text-center border border-dashed border-border rounded-lg text-text-muted">No recent projects found.</div>
             ) : (
               <div className="flex flex-col gap-2">
                 {recent.map(r => (
                   <button key={r.id} onClick={onOpenRecent || onNew} className="p-3 text-left bg-code-bg border border-border rounded-lg hover:border-accent hover:bg-accent-bg transition-colors">
                     <div className="font-bold text-text-h">{r.name}</div>
                     <div className="text-xs text-text-muted mt-1">Last edited {r.date}</div>
                   </button>
                 ))}
               </div>
             )}
          </div>
          
          <div>
             <h2 className="text-lg font-bold text-text-h mb-4 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-accent" /> Templates</h2>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onLoadTemplate('etl')} className="p-4 text-left bg-code-bg border border-border rounded-lg hover:border-accent hover:bg-accent-bg transition-colors flex flex-col gap-2">
                   <div className="font-bold text-text-h">Standard ETL</div>
                   <div className="text-xs text-text-muted">Read file, clean nulls, output Parquet.</div>
                </button>
                <button onClick={() => onLoadTemplate('analytics')} className="p-4 text-left bg-code-bg border border-border rounded-lg hover:border-accent hover:bg-accent-bg transition-colors flex flex-col gap-2">
                   <div className="font-bold text-text-h">Sales Analytics</div>
                   <div className="text-xs text-text-muted">Joins, aggregations, and window functions.</div>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
