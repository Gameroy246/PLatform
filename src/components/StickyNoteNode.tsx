"use client";
import React, { memo } from 'react';
import { FileText } from 'lucide-react';

const StickyNoteNodeComponent = ({ data, selected }: { data: any, selected?: boolean }) => {
  return (
    <div
      style={{
        background: data.color || '#fef3c7', // Yellowish sticky note
        border: selected ? `2px solid #f59e0b` : `1px solid #fcd34d`,
        borderRadius: 4,
        padding: '12px',
        minWidth: 200,
        boxShadow: selected ? `0 0 0 4px rgba(245, 158, 11, 0.3), var(--node-shadow)` : 'var(--node-shadow)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        color: '#92400e', // Dark text for contrast
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
        <FileText style={{ width: 14, height: 14 }} />
        Note
      </div>
      <div 
        style={{ 
          fontSize: 13, 
          fontFamily: 'Inter, sans-serif',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap'
        }}
      >
        {data.text || "Double click to edit note..."}
      </div>
    </div>
  );
}

export default memo(StickyNoteNodeComponent);
