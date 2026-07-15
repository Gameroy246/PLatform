import { Handle, Position } from '@xyflow/react';
import { ArrowRightLeft, Filter, Calculator } from 'lucide-react';

export default function TransformNode({ data }: { data: any }) {
  // Determine icon based on category/operation (just a basic mapping)
  const isCleaning = ['removeNulls', 'removeDuplicates', 'fillMissing', 'typeConversion', 'trimWhitespace', 'textCasing', 'replaceText', 'regexExtract', 'dropColumns', 'renameColumn'].includes(data.operation);
  const isAgg = ['groupBy', 'windowFunction', 'pivotTable', 'unpivotTable', 'rollup', 'summaryStats'].includes(data.operation);
  
  return (
    <div className="px-4 py-3 min-w-[180px] rounded-lg bg-bg border border-border shadow-shadow hover:border-accent-border transition-colors">
      {/* Input Connection Handle (Left) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-text-muted border-2 border-bg" 
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        {isCleaning ? <Filter className="w-4 h-4 text-orange-400" /> : isAgg ? <Calculator className="w-4 h-4 text-purple-400" /> : <ArrowRightLeft className="w-4 h-4 text-green-400" />}
        <div className="text-sm font-bold text-text-h">{data.label || 'Transform'}</div>
      </div>
      
      {/* Node Body (Optional summary of config) */}
      <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">
        {data.operation}
      </div>

      {/* Output Connection Handle (Right) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-accent border-2 border-bg" 
      />
    </div>
  );
}
