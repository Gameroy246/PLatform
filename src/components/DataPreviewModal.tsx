import React from 'react';

export default function DataPreviewModal({ previewData, previewError, setPreviewData, setPreviewError, nodeLabel }: { previewData: any, previewError: string, setPreviewData: (d: any) => void, setPreviewError: (e: string) => void, nodeLabel: string }) {
  if (!previewData && !previewError) return null;

  return (
    <>
      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewData(null)}>
          <div className="w-[80vw] max-w-4xl max-h-[80vh] bg-bg border border-border rounded-xl shadow-shadow flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center glass-header">
              <h2 className="text-lg font-bold text-text-h !m-0">Schema & Data Preview: {nodeLabel}</h2>
              <button onClick={() => setPreviewData(null)} className="text-text-muted hover:text-text-h">Close</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-code-bg">
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
                      {previewData.columns?.map((c: any, i: number) => (
                        <th key={i} className="p-2 border-b border-r border-border font-semibold text-text-h whitespace-nowrap">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.sample_data?.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-border hover:bg-code-bg/50">
                        {previewData.columns?.map((c: any, j: number) => (
                          <td key={j} className="p-2 border-r border-border whitespace-nowrap text-text font-mono truncate max-w-[200px]">{String(row[c.name] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
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
