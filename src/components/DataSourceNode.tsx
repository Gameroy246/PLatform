"use client";
import { Handle, Position } from '@xyflow/react';
import { Database, AlertTriangle } from 'lucide-react';

export default function DataSourceNode({ data }: { data: any }) {
  const isMissingFile = ['csvInput', 'jsonInput', 'parquetInput'].includes(data.operation) && !data.file;

  const displayLabel = (() => {
    if (!data.file) return 'Select a file…';
    try {
      const parsed = JSON.parse(data.file as string);
      if (Array.isArray(parsed) && parsed.length > 1) return `${parsed.length} files`;
      if (Array.isArray(parsed) && parsed.length === 1) return parsed[0].split(/[/\\]/).pop();
    } catch {}
    return typeof data.file === 'string' ? data.file.split(/[/\\]/).pop() : 'Select a file…';
  })();

  return (
    <div
      style={{
        background: data.color || 'var(--bg)',
        border: `1px solid ${isMissingFile ? '#ef4444' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '16px',
        minWidth: 220,
        boxShadow: 'var(--node-shadow)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 6, background: isMissingFile ? '#fef2f2' : 'var(--accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Database style={{ width: 18, height: 18, color: isMissingFile ? '#ef4444' : 'var(--accent)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {data.label || 'Data Source'}
            </span>
            {isMissingFile && (
              <AlertTriangle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }} />
            )}
          </div>
          <span style={{
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-muted)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}>
            {displayLabel}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle id="source" type="source" position={Position.Right} style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
