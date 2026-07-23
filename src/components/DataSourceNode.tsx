"use client";
import { Handle, Position } from '@xyflow/react';
import { Database, AlertTriangle } from 'lucide-react';

export default function DataSourceNode({ data }: { data: any }) {
  const isMissingFile = ['csvInput', 'jsonInput', 'parquetInput'].includes(data.operation) && !data.file;

  return (
    <div className={`px-4 py-3 min-w-[180px] rounded-md bg-code-bg border-l-4 shadow-sm hover:shadow-md transition-all relative ${
      isMissingFile ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse border-y border-r border-red-500' : 'border-l-accent border-y border-r border-border'
    }`}>
      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        <Database className={`w-4 h-4 ${isMissingFile ? 'text-red-500' : 'text-accent'}`} />
        <div className="text-sm font-bold text-text-h">{data.label || 'Data Source'}</div>
        {isMissingFile && <span title="Missing configuration"><AlertTriangle className="w-4 h-4 text-red-500 ml-auto" /></span>}
      </div>
      
      {/* Node Body */}
      <div className="text-[10px] text-text font-mono bg-bg px-2 py-1 rounded border border-border overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px]">
        {data.file || 'Select a file...'}
      </div>

      {/* Output Connection Handle */}
      <Handle 
        id="source"
        type="source" 
        position={Position.Right} 
        className="w-2 h-4 rounded-none bg-accent border-0 -mr-1" 
      />
    </div>
  );
}
