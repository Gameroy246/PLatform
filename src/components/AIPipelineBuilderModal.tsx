"use client";
import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIPipelineBuilderModalProps {
  onClose: () => void;
  onGenerate: (pipeline: { nodes: any[]; edges: any[] }) => void;
}

export default function AIPipelineBuilderModal({ onClose, onGenerate }: AIPipelineBuilderModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      onGenerate(data.pipeline);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="w-[600px] bg-bg border border-border rounded-xl shadow-2xl flex flex-col p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-h">AI Pipeline Builder</h2>
            <p className="text-sm text-text-muted">Describe your data workflow in plain English</p>
          </div>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., Read users.csv, filter where age > 18, inner join with purchases.json on user_id, and group by country to calculate average spend. Finally export to Parquet."
          className="w-full h-32 p-4 bg-code-bg border border-border rounded-lg text-text focus:border-accent focus:outline-none resize-none mb-4"
          disabled={loading}
        />
        
        {error && <div className="text-red-400 text-sm mb-4 px-3 py-2 bg-red-900/20 rounded border border-red-900/50">{error}</div>}
        
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg text-text hover:bg-code-bg transition-colors">Cancel</button>
          <button onClick={handleGenerate} disabled={loading || !prompt} className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 bg-accent text-white shadow-glow hover-bg-lift disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Build Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}
