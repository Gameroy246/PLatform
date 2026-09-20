import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Edit2, Play, MousePointer2, FileText, LayoutGrid, EyeOff } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  type: 'node' | 'pane' | 'edge';
  nodeId?: string;
  edgeId?: string;
  onClose: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onMute?: () => void;
  onRunUpToHere?: () => void;
  onAddNote?: () => void;
  onAutoLayout?: () => void;
  onSelectAll?: () => void;
  onInsertNode?: () => void;
}

export default function ContextMenu({ 
  x, y, type, onClose, 
  onDuplicate, onCopy, onPaste, onDelete, onRename, onMute, onRunUpToHere,
  onAddNote, onAutoLayout, onSelectAll, onInsertNode
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const Item = ({ icon: Icon, label, onClick, shortcut, danger = false }: any) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); onClose(); }}
      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-bg/50 transition-colors ${danger ? 'text-red-500 hover:text-red-400' : 'text-text hover:text-text-h'}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-[10px] text-text-muted">{shortcut}</span>}
    </button>
  );

  return (
    <div 
      ref={menuRef}
      style={{ top: y, left: x }}
      className="fixed z-[100] w-48 bg-code-bg border border-border rounded-lg shadow-xl overflow-hidden py-1"
    >
      {type === 'node' && (
        <>
          <Item icon={Play} label="Run to here" onClick={onRunUpToHere} />
          <div className="h-px bg-border my-1 mx-2" />
          <Item icon={Edit2} label="Rename" onClick={onRename} shortcut="Dbl Click" />
          <Item icon={EyeOff} label="Mute Node" onClick={onMute} />
          <Item icon={Copy} label="Duplicate" onClick={onDuplicate} shortcut="Cmd+D" />
          <Item icon={Copy} label="Copy" onClick={onCopy} shortcut="Cmd+C" />
          <div className="h-px bg-border my-1 mx-2" />
          <Item icon={Trash2} label="Delete" onClick={onDelete} shortcut="Del" danger />
        </>
      )}
      
      {type === 'pane' && (
        <>
          <Item icon={Copy} label="Paste" onClick={onPaste} shortcut="Cmd+V" />
          <div className="h-px bg-border my-1 mx-2" />
          <Item icon={FileText} label="Add Sticky Note" onClick={onAddNote} />
          <Item icon={LayoutGrid} label="Auto Layout" onClick={onAutoLayout} />
          <Item icon={MousePointer2} label="Select All" onClick={onSelectAll} shortcut="Cmd+A" />
        </>
      )}
      
      {type === 'edge' && (
        <>
          <Item icon={MousePointer2} label="Insert Node Between" onClick={onInsertNode} />
          <div className="h-px bg-border my-1 mx-2" />
          <Item icon={Trash2} label="Delete Edge" onClick={onDelete} shortcut="Del" danger />
        </>
      )}
    </div>
  );
}
