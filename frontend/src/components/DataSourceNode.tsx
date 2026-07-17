import { Handle, Position } from '@xyflow/react';
import { Database } from 'lucide-react';

export default function DataSourceNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 min-w-[180px] rounded-md bg-code-bg border-l-4 border-l-accent border-y border-r border-border shadow-sm hover:shadow-md transition-shadow relative">
      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-accent" />
        <div className="text-sm font-bold text-text-h">{data.label || 'Data Source'}</div>
      </div>
      
      {/* Node Body */}
      <div className="text-[10px] text-text font-mono bg-bg px-2 py-1 rounded border border-border overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px]">
        {data.file || 'Select a file...'}
      </div>

      {/* Output Connection Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-4 rounded-none bg-accent border-0 -mr-1" 
      />
    </div>
  );
}