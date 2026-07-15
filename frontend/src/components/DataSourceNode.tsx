import { Handle, Position } from '@xyflow/react';
import { Database } from 'lucide-react';

export default function DataSourceNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 min-w-[180px] rounded-lg bg-bg border-2 border-accent shadow-shadow">
      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-accent" />
        <div className="text-sm font-bold text-text-h">{data.label || 'Data Source'}</div>
      </div>
      
      {/* Node Body */}
      <div className="text-xs text-text font-mono bg-code-bg p-1 rounded border border-border">
        {data.file || 'Select a file...'}
      </div>

      {/* Output Connection Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-accent border-2 border-bg" 
      />
    </div>
  );
}