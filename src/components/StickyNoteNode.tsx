"use client";
import { StickyNote } from 'lucide-react';
import { useStore } from '../store';

export default function StickyNoteNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore(state => state.updateNodeData);

  return (
    <div className="p-3 min-w-[200px] max-w-[280px] rounded-lg bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 shadow-sm relative text-xs">
      <div className="flex items-center gap-1.5 font-bold text-yellow-800 dark:text-yellow-400 mb-1.5">
        <StickyNote className="w-3.5 h-3.5" />
        <span>Note</span>
      </div>
      <textarea 
        value={data.label || ''} 
        onChange={(e) => updateNodeData(id, { label: e.target.value })}
        placeholder="Type a documentation note..."
        rows={3}
        className="w-full bg-transparent resize-none focus:outline-none text-yellow-900 dark:text-yellow-200 font-sans text-xs leading-relaxed"
      />
    </div>
  );
}
