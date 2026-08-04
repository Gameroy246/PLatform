import React from 'react';

export default function DataPreviewModal({ previewData, previewError, setPreviewData, setPreviewError, nodeLabel }: { previewData: any, previewError: string, setPreviewData: (d: any) => void, setPreviewError: (e: string) => void, nodeLabel: string }) {
  if (!previewData && !previewError) return null;

  return (
    <>
      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewData(null)}>
          <div className="w-[80vw] max-w-4xl max-h-[80vh] bg-bg border border-border rounded-xl shadow-shadow flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border glass-header">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-text-h">Data Preview: {nodeLabel}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const dict = previewData.columns?.map((c: any) => `- **${c.name}**: ${c.type}`).join('\n') || '';
                      const blob = new Blob([`# Data Dictionary\n\n${dict}`], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'data_dictionary.md';
                      a.click();
                    }}
                    className="px-3 py-1 bg-code-bg border border-border rounded text-sm text-text-muted hover:text-text transition-colors"
                  >
                    Export Dictionary
                  </button>
                  <button onClick={() => setPreviewData(null)} className="text-text-muted hover:text-text-h">Close</button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-code-bg">
              <div className="flex gap-4 mb-4">
                <div className="px-3 py-1 bg-code-bg border border-border rounded-md font-mono text-xs text-text-h shadow-sm">
                  <span className="text-text-muted mr-2">Rows:</span> {previewData.metadata?.row_count?.toLocaleString() || (previewData.sample_data?.length || 0)}
                </div>
                <div className="px-3 py-1 bg-code-bg border border-border rounded-md font-mono text-xs text-text-h shadow-sm">
                  <span className="text-text-muted mr-2">Cols:</span> {previewData.columns?.length || 0}
                </div>
                {previewData.sample_data && (
                  <div className="px-3 py-1 bg-code-bg border border-border rounded-md font-mono text-xs text-text-h shadow-sm" title="Exact row duplicates in the sample data">
                    <span className="text-text-muted mr-2">Duplicates (Sample):</span> 
                    <span className={previewData.sample_data.length - new Set(previewData.sample_data.map((r: any) => JSON.stringify(r))).size > 0 ? 'text-orange-400 font-bold' : 'text-green-400'}>
                      {previewData.sample_data.length - new Set(previewData.sample_data.map((r: any) => JSON.stringify(r))).size}
                    </span>
                  </div>
                )}
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-h mb-2">Columns Schema</h3>
                <div className="flex flex-wrap gap-2">
                  {previewData.columns?.map((c: any, i: number) => (
                    <div key={i} className="px-2 py-1 bg-bg border border-border rounded text-xs font-mono">
                      <span className="text-accent">{c.name}</span> <span className="text-text-muted">{c.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            <h3 className="text-sm font-bold text-text-h mb-2">Sample Data (Top 50)</h3>
              <div className="overflow-x-auto border border-border rounded bg-bg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-code-bg">
                    <tr>
                      {previewData.columns?.map((c: any, i: number) => {
                      // Calculate basic stats for the sample
                      const values = (previewData.sample_data || []).map((r: any) => r[c.name]);
                      const nonNulls = values.filter((v: any) => v !== null && v !== undefined && v !== '');
                      const completeness = values.length ? (nonNulls.length / values.length) * 100 : 0;
                      
                      const isNumeric = c.type.includes('INT') || c.type.includes('FLOAT') || c.type.includes('DOUBLE') || c.type.includes('DECIMAL');
                      let bins: number[] | null = null;
                      let maxBin = 1;
                      let uniqueCount = 0;
                      
                      if (isNumeric) {
                        const numVals = nonNulls.map((v: any) => Number(v)).filter((v: any) => !isNaN(v));
                        if (numVals.length > 0) {
                          const min = Math.min(...numVals);
                          const max = Math.max(...numVals);
                          bins = [0,0,0,0,0,0,0,0,0,0]; // 10 bins
                          const range = max - min || 1;
                          numVals.forEach((v: number) => {
                            let binIdx = Math.floor(((v - min) / range) * 10);
                            if (binIdx >= 10) binIdx = 9;
                            bins![binIdx]++;
                          });
                          maxBin = Math.max(...bins) || 1;
                        }
                      } else {
                        uniqueCount = new Set(nonNulls).size;
                      }

                      return (
                        <th key={i} className="p-3 border-b border-r border-border font-semibold text-text-h whitespace-nowrap align-top min-w-[120px]">
                          <div className="mb-2 text-sm">{c.name}</div>
                          <div className="flex flex-col gap-1 text-[10px] font-normal text-text-muted mt-2 border-t border-border pt-2">
                            <div className="flex justify-between items-center">
                              <span>Valid</span>
                              <span className={completeness < 100 ? 'text-yellow-500 font-bold' : 'text-green-500'}>{completeness.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1 bg-bg rounded overflow-hidden">
                              <div className={`h-full ${completeness < 100 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${completeness}%` }}></div>
                            </div>
                            {bins && (
                              <div className="flex items-end h-8 gap-[1px] mt-2 w-full bg-bg p-[1px] rounded" title="Distribution Histogram">
                                {bins.map((count: number, bIdx: number) => (
                                  <div key={bIdx} className="flex-1 bg-accent/60 hover:bg-accent transition-colors rounded-t-[1px]" style={{ height: `${(count / maxBin) * 100}%` }} title={`Count: ${count}`} />
                                ))}
                              </div>
                            )}
                            {!bins && (
                              <div className="mt-1 font-mono text-center bg-bg py-1 rounded">
                                {uniqueCount} unique
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                    {(() => {
                      // Pre-compute colStats for outliers
                      const colStats: Record<string, any> = {};
                      previewData.columns?.forEach((c: any) => {
                        const isNumeric = c.type.includes('INT') || c.type.includes('FLOAT') || c.type.includes('DOUBLE') || c.type.includes('DECIMAL');
                        if (isNumeric) {
                          const vals = (previewData.sample_data || []).map((r: any) => Number(r[c.name])).filter((v: any) => !isNaN(v));
                          if (vals.length > 0) {
                            const mean = vals.reduce((a:number,b:number)=>a+b, 0) / vals.length;
                            const variance = vals.reduce((a:number,b:number)=>a+Math.pow(b-mean, 2), 0) / vals.length;
                            colStats[c.name] = { mean, stdDev: Math.sqrt(variance) };
                          }
                        }
                      });

                      return previewData.sample_data?.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-border hover:bg-code-bg/50">
                          {previewData.columns?.map((c: any, j: number) => {
                            const val = row[c.name];
                            const isNull = val === null || val === undefined || val === '';
                            
                            let isOutlier = false;
                            if (!isNull && colStats[c.name]) {
                               const num = Number(val);
                               if (!isNaN(num) && colStats[c.name].stdDev > 0) {
                                 if (Math.abs(num - colStats[c.name].mean) > 2 * colStats[c.name].stdDev) {
                                   isOutlier = true;
                                 }
                               }
                            }
                            
                            return (
                              <td key={j} className={`p-2 border-r border-border whitespace-nowrap text-text font-mono truncate max-w-[200px] ${isNull ? 'bg-red-900/30 text-red-400 italic' : isOutlier ? 'bg-orange-900/30 text-orange-400 font-bold' : ''}`} title={isOutlier ? 'Statistical Outlier (>2 StdDev)' : isNull ? 'Missing Value' : ''}>
                                {isNull ? 'NULL' : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Modal */}
      {previewError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewError('')}>
          <div className="w-full max-w-md p-6 bg-bg border border-red-500/50 rounded-xl shadow-shadow text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-2">Preview Unavailable</h3>
            <p className="text-sm text-text mb-4">{previewError}</p>
            <button onClick={() => setPreviewError('')} className="px-4 py-2 bg-code-bg text-text-h rounded hover-lift">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
