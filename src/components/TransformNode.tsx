"use client";
import { Handle, Position } from '@xyflow/react';
import { ArrowRightLeft, Filter, Calculator } from 'lucide-react';

export default function TransformNode({ data }: { data: any }) {
  const isCleaning = ['removeNulls', 'removeDuplicates', 'fillMissing', 'typeConversion', 'trimWhitespace', 'textCasing', 'replaceText', 'regexExtract', 'dropColumns', 'renameColumn'].includes(data.operation);
  const isAgg = ['groupBy', 'windowFunction', 'pivotTable', 'unpivotTable', 'rollup', 'summaryStats'].includes(data.operation);
  
  return (
    <div className={`px-4 py-3 min-w-[180px] rounded-lg bg-bg border border-border shadow-sm hover:shadow-md transition-shadow relative`}>
      {/* Input Connection Handle (Left) */}
      <Handle 
        id="target"
        type="target" 
        position={Position.Left} 
        className="w-2 h-4 rounded-none bg-border border-0 -ml-[5px]" 
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        {isCleaning ? <Filter className="w-4 h-4 text-text-muted" /> : isAgg ? <Calculator className="w-4 h-4 text-text-muted" /> : <ArrowRightLeft className="w-4 h-4 text-text-muted" />}
        <div className="text-sm font-semibold text-text-h">{data.label || 'Transform'}</div>
      </div>
      
      {/* Node Body (Optional summary of config) */}
      <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">
        {data.operation}
      </div>

      {/* Output Connection Handle (Right) */}
      <div className="flex flex-col gap-2 absolute -right-1 top-1/2 -translate-y-1/2">
        <Handle 
          id="source"
          type="source" 
          position={Position.Right} 
          className="w-2 h-4 rounded-none bg-accent border-0 !relative !top-0 !right-0 !transform-none" 
        />
        {data.operation === 'dataQuality' && (
          <Handle 
            id="error"
            type="source" 
            position={Position.Right} 
            className="w-2 h-4 rounded-none bg-red-500 border-0 !relative !top-0 !right-0 !transform-none" 
          />
        )}
      </div>
    </div>
  );
}

