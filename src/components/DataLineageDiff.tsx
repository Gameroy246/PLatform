import React, { useMemo } from 'react';
import { FileDiff, ArrowRight, PlusCircle, MinusCircle } from 'lucide-react';

interface DataLineageDiffProps {
  inputData: any[];
  outputData: any[];
}

export default function DataLineageDiff({ inputData, outputData }: DataLineageDiffProps) {
  const diff = useMemo(() => {
    const inputCols = inputData && inputData.length > 0 ? Object.keys(inputData[0]) : [];
    const outputCols = outputData && outputData.length > 0 ? Object.keys(outputData[0]) : [];
    
    const added = outputCols.filter(c => !inputCols.includes(c));
    const removed = inputCols.filter(c => !outputCols.includes(c));
    const kept = inputCols.filter(c => outputCols.includes(c));

    const inputRows = inputData ? inputData.length : 0;
    const outputRows = outputData ? outputData.length : 0;
    
    return { added, removed, kept, inputRows, outputRows };
  }, [inputData, outputData]);

  return (
    <div className="flex gap-6 h-full p-4 overflow-auto">
      {/* Schema Diff */}
      <div className="flex-1 border border-border rounded-lg bg-bg overflow-hidden flex flex-col">
        <div className="bg-code-bg px-4 py-2 border-b border-border flex items-center gap-2 font-medium text-sm text-text-h">
          <FileDiff className="w-4 h-4 text-accent" /> Schema Mutations
        </div>
        <div className="p-4 flex flex-col gap-2 overflow-auto">
          {diff.added.length === 0 && diff.removed.length === 0 && (
             <div className="text-text-muted text-sm italic">No schema changes detected.</div>
          )}
          
          {diff.removed.map(col => (
            <div key={col} className="flex items-center gap-2 text-red-500 text-sm font-mono bg-red-500/10 px-2 py-1 rounded">
              <MinusCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{col}</span>
            </div>
          ))}

          {diff.added.map(col => (
            <div key={col} className="flex items-center gap-2 text-green-500 text-sm font-mono bg-green-500/10 px-2 py-1 rounded">
              <PlusCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{col}</span>
            </div>
          ))}
          
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Unchanged Columns ({diff.kept.length})</h4>
            <div className="flex flex-wrap gap-2">
               {diff.kept.map(col => (
                  <span key={col} className="text-xs font-mono bg-code-bg text-text-muted px-1.5 py-0.5 rounded border border-border">
                     {col}
                  </span>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row Count Diff */}
      <div className="w-[300px] border border-border rounded-lg bg-bg overflow-hidden flex flex-col">
        <div className="bg-code-bg px-4 py-2 border-b border-border font-medium text-sm text-text-h">
          Row Count Impact
        </div>
        <div className="p-6 flex flex-col items-center justify-center flex-1">
          <div className="flex items-center gap-4 w-full justify-between">
            <div className="flex flex-col items-center">
               <span className="text-xs text-text-muted font-medium mb-1">Input</span>
               <span className="text-xl font-mono text-text-h bg-code-bg px-3 py-1 rounded border border-border">{diff.inputRows}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center text-text-muted">
               <ArrowRight className="w-5 h-5" />
               <span className="text-[10px] mt-1 font-semibold">
                 {diff.outputRows > diff.inputRows ? (
                    <span className="text-green-500">+{diff.outputRows - diff.inputRows}</span>
                 ) : diff.outputRows < diff.inputRows ? (
                    <span className="text-red-500">{diff.outputRows - diff.inputRows}</span>
                 ) : (
                    <span>Unchanged</span>
                 )}
               </span>
            </div>
            
            <div className="flex flex-col items-center">
               <span className="text-xs text-text-muted font-medium mb-1">Output</span>
               <span className="text-xl font-mono text-accent bg-accent/10 px-3 py-1 rounded border border-accent/20">{diff.outputRows}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
