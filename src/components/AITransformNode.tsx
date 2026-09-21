"use client";
import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, Code2, Loader2 } from 'lucide-react';
import { useStore } from '../store';

const AITransformNodeComponent = ({ id, data, selected }: { id: string, data: any, selected?: boolean }) => {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const updateNodeData = useStore((state) => state.updateNodeData);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    // In a real app, this would call an LLM API passing the parent schema and the prompt
    // Here we simulate the AI generation process
    setTimeout(() => {
      let generatedSql = `SELECT * FROM {parent}`;
      
      const p = prompt.toLowerCase();
      if (p.includes('count') || p.includes('group')) {
         generatedSql = `SELECT column_1, COUNT(*) as count FROM {parent} GROUP BY column_1`;
      } else if (p.includes('filter') || p.includes('where')) {
         generatedSql = `SELECT * FROM {parent} WHERE column_1 IS NOT NULL`;
      } else if (p.includes('sort') || p.includes('order')) {
         generatedSql = `SELECT * FROM {parent} ORDER BY 1 DESC`;
      } else {
         generatedSql = `-- AI Generated based on: ${prompt}\nSELECT * FROM {parent}`;
      }

      updateNodeData(id, { 
        ...data, 
        prompt, 
        operation: 'customSql', 
        sql: generatedSql,
        status: 'SUCCESS' 
      });
      setIsGenerating(false);
    }, 1500);
  };

  const accentColor = '#8b5cf6'; // Purple for AI

  return (
    <div
      style={{
        background: data.color || 'var(--bg)',
        border: selected ? `2px solid ${accentColor}` : data.status === 'SUCCESS' ? '2px solid #4ade80' : data.status === 'ERROR' ? '2px solid #f87171' : `1px solid var(--border)`,
        borderRadius: 8,
        padding: '16px',
        minWidth: 280,
        boxShadow: data.status === 'SUCCESS' ? '0 0 15px rgba(74, 222, 128, 0.2)' : selected ? `0 0 0 4px ${accentColor}33, var(--node-shadow)` : 'var(--node-shadow)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: data.muted ? 0.4 : 1,
        filter: data.muted ? 'grayscale(100%)' : 'none',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {/* Input handle */}
      <Handle id="target" type="target" position={Position.Left} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 6, background: 'rgba(139, 92, 246, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Sparkles style={{ width: 18, height: 18, color: accentColor }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {data.label || 'AI Transform'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Deterministic AI SQL Generation
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
         <textarea 
            value={prompt}
            onChange={(e) => {
               setPrompt(e.target.value);
               updateNodeData(id, { ...data, prompt: e.target.value });
            }}
            placeholder="E.g., group by country and calculate average revenue..."
            className="w-full bg-code-bg border border-border rounded text-xs p-2 text-text min-h-[60px] resize-none focus:outline-none focus:border-accent"
            onKeyDown={(e) => {
               if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
               }
            }}
         />
         <div className="flex justify-between items-center">
            <span className="text-[9px] text-text-muted">Cmd+Enter to generate</span>
            <button 
               onClick={handleGenerate}
               disabled={!prompt || isGenerating}
               className="flex items-center gap-1.5 bg-accent text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
               {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
               Generate SQL
            </button>
         </div>
      </div>
      
      {data.sql && !isGenerating && (
         <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-600 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> SQL Generated Successfully
         </div>
      )}

      {/* Output handle */}
      <Handle id="source" type="source" position={Position.Right} />
    </div>
  );
}

export default memo(AITransformNodeComponent);
