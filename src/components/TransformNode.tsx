"use client";
import { Handle, Position } from '@xyflow/react';
import { ArrowRightLeft, Filter, Calculator, ShieldAlert } from 'lucide-react';

const OP_ACCENT: Record<string, string> = {
  // Cleaning — indigo
  removeDuplicates: '#6366f1', removeNulls: '#6366f1', fillMissing: '#6366f1',
  typeConversion: '#6366f1', trimWhitespace: '#6366f1', textCasing: '#6366f1',
  replaceText: '#6366f1', regexExtract: '#6366f1', dropColumns: '#6366f1', renameColumn: '#6366f1',
  // Aggregation — violet
  groupBy: '#8b5cf6', windowFunction: '#8b5cf6', pivotTable: '#8b5cf6',
  unpivotTable: '#8b5cf6', rollup: '#8b5cf6', summaryStats: '#8b5cf6',
  // Joins — sky
  innerJoin: '#0ea5e9', leftJoin: '#0ea5e9', rightJoin: '#0ea5e9',
  fullOuterJoin: '#0ea5e9', selfJoin: '#0ea5e9', antiJoin: '#0ea5e9', semiJoin: '#0ea5e9',
  // Set ops — teal
  unionAll: '#14b8a6', intersectNodes: '#14b8a6', exceptNodes: '#14b8a6',
  // Quality — amber
  dataQuality: '#f59e0b',
  // Export — emerald
  exportCsv: '#22c55e', exportParquet: '#22c55e', exportJson: '#22c55e',
};

export default function TransformNode({ data }: { data: any }) {
  const isCleaning = ['removeNulls', 'removeDuplicates', 'fillMissing', 'typeConversion', 'trimWhitespace',
    'textCasing', 'replaceText', 'regexExtract', 'dropColumns', 'renameColumn'].includes(data.operation);
  const isAgg = ['groupBy', 'windowFunction', 'pivotTable', 'unpivotTable', 'rollup', 'summaryStats'].includes(data.operation);
  const isQuality = data.operation === 'dataQuality';

  const accentColor = OP_ACCENT[data.operation] || 'var(--accent)';
  const Icon = isCleaning ? Filter : isAgg ? Calculator : isQuality ? ShieldAlert : ArrowRightLeft;

  return (
    <div
      style={{
        background: data.color || 'var(--bg)',
        border: `1px solid var(--border)`,
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
      {/* Input handle */}
      <Handle id="target" type="target" position={Position.Left} />

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 6, background: 'var(--accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon style={{ width: 18, height: 18, color: accentColor }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {data.label || 'Transform'}
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-muted)',
            marginTop: 2,
          }}>
            {data.operation.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Output handles */}
      <div style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Handle id="source" type="source" position={Position.Right} style={{ position: 'relative', top: 'auto', right: 'auto', transform: 'none' }} />
        {isQuality && (
          <Handle
            id="error"
            type="source"
            position={Position.Right}
            style={{ position: 'relative', top: 'auto', right: 'auto', transform: 'none', backgroundColor: '#ef4444' }}
          />
        )}
      </div>
    </div>
  );
}
