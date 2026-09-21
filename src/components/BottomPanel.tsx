import React from 'react';
import { FolderOutput, FileInput, TerminalSquare, Activity, PieChart, LayoutGrid, ShieldCheck, Code, History as HistoryIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import Dashboard from './Dashboard';
import DataProfiler from './DataProfiler';
import HistoryViewer from './HistoryViewer';
import AuditLogs from './AuditLogs';
import DataLineageDiff from './DataLineageDiff';
import { generateNodeSQL, generateProductionSQL } from '../lib/sqlGenerator';
import { useStore } from '../store';
import axios from 'axios';
import { PipelineNode, PipelineEdge, PipelineMetadata } from '../lib/types';


export interface BottomPanelProps {
  consoleHeight: number;
  setIsResizingConsole: (resizing: boolean) => void;
  activeConsoleTab: string;
  setActiveConsoleTab: (tab: any) => void;
  selectedNode: any;
  fetchInputPreview: () => void;
  nodes: any[];
  edges: any[];
  sqlOutput: string;
  explainPlan: string;
  executionLogs: string[];
  previewData: any[];
  inputPreviewData: any[];
  pipelineMetadata: any;
  downloadUrl: string | null;
  outputFormat: string;
  setOutputFormat: (format: string) => void;
  theme?: string;
  projectId?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  setPreviewData: (data: any[]) => void;
}

export default function BottomPanel(props: BottomPanelProps) {
  const {
    consoleHeight, setIsResizingConsole, activeConsoleTab, setActiveConsoleTab, selectedNode,
    fetchInputPreview, nodes, edges, sqlOutput, explainPlan, executionLogs, previewData,
    inputPreviewData, pipelineMetadata, downloadUrl, outputFormat, setOutputFormat,
    theme, projectId, showToast, setPreviewData
  } = props;

  return (
    <footer style={{ height: consoleHeight }} className="border-t border-border bg-bg p-0 flex flex-col z-10 shadow-shadow">
        <div className="flex border-b border-border bg-code-bg px-2 pt-1.5 overflow-x-auto no-scrollbar items-end gap-1">
          <button 
            onClick={() => setActiveConsoleTab('output')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'output' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <FolderOutput className="w-3.5 h-3.5" />
            {selectedNode ? <span>Output <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded ml-1 border border-accent/20">{String(selectedNode.data?.operation || 'Node')}</span></span> : 'Output Preview'}
          </button>
          
          <button 
            onClick={() => { setActiveConsoleTab('input'); fetchInputPreview(); }}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'input' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <FileInput className="w-3.5 h-3.5" /> Input Preview
          </button>

          <button 
            onClick={() => setActiveConsoleTab('diff')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'diff' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <Code className="w-3.5 h-3.5" /> Data Lineage Diff
          </button>
          
          <button 
            onClick={() => setActiveConsoleTab('sql')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'sql' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <TerminalSquare className="w-3.5 h-3.5" /> Node SQL
          </button>

          <button 
            onClick={() => setActiveConsoleTab('profiler')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'profiler' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Data Profiler
          </button>
          
          <button 
            onClick={() => setActiveConsoleTab('dashboard')} 
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'dashboard' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <PieChart className="w-3.5 h-3.5" /> Dashboard
          </button>
          
          <div className="w-px h-4 bg-border mx-1 self-center" />

          <button 
            onClick={() => setActiveConsoleTab('logs')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'logs' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Execution Logs
          </button>
          
          <button 
            onClick={() => setActiveConsoleTab('explain')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === 'explain' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Metrics
          </button>
          
          <button 
            onClick={() => setActiveConsoleTab('history' as any)}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === ('history' as any) ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <HistoryIcon className="w-3.5 h-3.5" /> History
          </button>
          
          <button 
            onClick={() => setActiveConsoleTab('audit' as any)}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ${activeConsoleTab === ('audit' as any) ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Audit
          </button>
          
          <div className="w-px h-4 bg-border mx-1 self-center" />
          
          <button 
            onClick={() => setActiveConsoleTab('dbt')}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 rounded-t-md ml-auto ${activeConsoleTab === 'dbt' ? 'text-accent border-accent bg-bg shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text hover:bg-bg/50 border-transparent'}`}
          >
            <Code className="w-3.5 h-3.5" /> Production SQL (dbt)
          </button>
        </div>
        
        {/* Dynamic Content Area */}
        <div className="flex-1 min-h-0 overflow-auto bg-bg">
          {activeConsoleTab === 'sql' && (
            <div className="p-4 h-full bg-code-bg relative group">
              <pre className="text-sm font-mono text-text whitespace-pre-wrap">
                {selectedNode ? (() => {
                  const storedVars = JSON.parse(localStorage.getItem('ARCHITECT_VARIABLES') || '[]');
                  const variablesRecord = storedVars.reduce((acc: any, v: any) => ({ ...acc, [v.key]: v.value }), {});
                  return generateNodeSQL(selectedNode, edges, variablesRecord);
                })() : "-- Select a node to view its generated SQL"}
              </pre>
            </div>
          )}

          {activeConsoleTab === 'diff' && (
             <div className="h-full bg-bg">
                <DataLineageDiff inputData={inputPreviewData} outputData={previewData} />
             </div>
          )}

          {activeConsoleTab === 'dbt' && (
            <div className="p-4 h-full bg-code-bg relative group flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-text-muted">Auto-compiled CTE for production (Snowflake, BigQuery, dbt)</span>
                <button 
                  onClick={() => {
                    const storedVars = JSON.parse(localStorage.getItem('ARCHITECT_VARIABLES') || '[]');
                    const variablesRecord = storedVars.reduce((acc: any, v: any) => ({ ...acc, [v.key]: v.value }), {});
                    navigator.clipboard.writeText(generateProductionSQL(nodes, edges, variablesRecord));
                    showToast("Production SQL copied to clipboard", "success");
                  }}
                  className="px-3 py-1 bg-accent/20 text-accent rounded text-xs font-medium hover:bg-accent/30 transition-colors"
                >
                  Copy SQL
                </button>
              </div>
              <pre className="text-xs font-mono text-text whitespace-pre-wrap bg-bg p-4 rounded-lg border border-border flex-1 overflow-auto">
                {(() => {
                  const storedVars = JSON.parse(localStorage.getItem('ARCHITECT_VARIABLES') || '[]');
                  const variablesRecord = storedVars.reduce((acc: any, v: any) => ({ ...acc, [v.key]: v.value }), {});
                  return generateProductionSQL(nodes, edges, variablesRecord);
                })()}
              </pre>
            </div>
          )}

          {activeConsoleTab === 'dashboard' && (
             <Dashboard data={previewData} columns={pipelineMetadata?.columns || []} />
          )}
          
          {activeConsoleTab === 'output' && (
             <div className="p-4 h-full flex flex-col min-h-0 gap-2">
                {pipelineMetadata && (
                  <div className="flex gap-4 p-2 bg-code-bg text-xs border-b border-border items-center">
                    <span className="text-accent font-bold">PROFILING</span>
                    <span>Total Rows: {pipelineMetadata.row_count?.toLocaleString()}{pipelineMetadata.sample_count ? ` (showing ${pipelineMetadata.sample_count})` : ''}</span>
                    <span>Columns: {pipelineMetadata.column_count}</span>
                    {downloadUrl && (
                      <div className="ml-auto flex items-center gap-2">
                        <select 
                          value={outputFormat} 
                          onChange={(e) => setOutputFormat(e.target.value)}
                          className="px-2 py-1 bg-bg border border-border rounded-md text-xs text-text focus:outline-none focus:border-accent"
                        >
                          <option value="csv">CSV</option>
                          <option value="parquet">Parquet</option>
                          <option value="json">JSON</option>
                          <option value="xlsx">Excel (XLSX)</option>
                        </select>
                        <a href={downloadUrl} className="px-3 py-1 bg-accent text-white rounded-md text-xs font-medium hover-lift transition-colors flex items-center gap-2">
                          <FolderOutput className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-auto">
                  {(previewData || []).length > 0 ? (
                    <table className="w-full text-left text-sm text-text border-collapse">
                      <thead className="text-text-h border-b border-border bg-bg sticky top-0">
                        <tr>
                          {Object.keys(previewData[0]).map((key) => {
                            const summaryData = pipelineMetadata?.summary?.find((s: any) => s.column_name === key);
                            return (
                              <th key={key} className="p-2 whitespace-nowrap min-w-[120px] align-top">
                                <div className="flex items-center">
                                  {key}
                                  {pipelineMetadata?.columns && (
                                    <span className="ml-2 text-[10px] text-text-muted font-normal lowercase bg-code-bg px-1 rounded">
                                      {pipelineMetadata.columns.find((c: any) => c.name === key)?.type}
                                    </span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-code-bg/50 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                      <p className="text-sm">No output data yet.</p>
                      {selectedNode ? (
                        <button
                          onClick={async () => {
                            try {
                              showToast("Fetching preview for selected node...", "success");
                              const mappedNodes = nodes.map(n => ({ id: n.id, sql: generateNodeSQL(n, edges) }));
                              const payload = { nodes: mappedNodes, edges, targetNodeId: selectedNode.id };
                              const res = await axios.post('/api/preview', payload);
                              setPreviewData(res.data.preview.sample_data || []);
                            } catch (e: any) {
                              showToast(e.response?.data?.error || "Failed to fetch preview", "error");
                            }
                          }}
                          className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Preview Selected Node
                        </button>
                      ) : (
                        <p className="text-xs">Select a node, then click here to preview — or run the full pipeline.</p>
                      )}
                    </div>
                  )}
                </div>
             </div>
          )}

          {activeConsoleTab === 'input' && (
             <div className="p-4 h-full flex flex-col gap-2">
                <div className="flex-1 overflow-auto">
                  {(inputPreviewData || []).length > 0 ? (
                    <table className="w-full text-left text-sm text-text border-collapse">
                      <thead className="text-text-h border-b border-border bg-bg sticky top-0">
                        <tr>
                          {Object.keys(inputPreviewData[0]).map((key) => (
                            <th key={key} className="p-2 whitespace-nowrap">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inputPreviewData.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-code-bg/50 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                      <p className="text-sm">No input data yet.</p>
                      {selectedNode ? (
                        <button
                          onClick={fetchInputPreview}
                          className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Fetch Input Preview
                        </button>
                      ) : (
                        <p className="text-xs">Select a transform node to preview its input data.</p>
                      )}
                    </div>
                  )}
                </div>
             </div>
          )}

          {activeConsoleTab === 'profiler' && (
             <div className="h-full overflow-y-auto">
               <DataProfiler data={pipelineMetadata?.profiling_data || []} rowCount={pipelineMetadata?.row_count || 0} />
             </div>
          )}

          {activeConsoleTab === 'explain' && (
             <div className="p-4 h-full bg-bg overflow-auto flex flex-col gap-4">
                <h3 className="text-sm font-bold text-text-h mb-2">Execution Metrics Profiler</h3>
                
                <div className="flex gap-4 mb-4">
                  <div className="p-4 border border-border rounded-lg bg-code-bg flex-1">
                    <p className="text-xs text-text-muted mb-1">Total Pipeline Duration</p>
                    <p className="text-2xl font-bold text-accent">{pipelineMetadata?.duration_ms || 0}ms</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg bg-code-bg flex-1">
                    <p className="text-xs text-text-muted mb-1">Total Rows Processed</p>
                    <p className="text-2xl font-bold text-text-h">{pipelineMetadata?.row_count || 0}</p>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm text-text border-collapse">
                    <thead className="bg-code-bg border-b border-border">
                      <tr>
                        <th className="p-3 font-semibold text-text-muted">Node Name</th>
                        <th className="p-3 font-semibold text-text-muted">Operation</th>
                        <th className="p-3 font-semibold text-text-muted">Duration (ms)</th>
                        <th className="p-3 font-semibold text-text-muted">Cache Hit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(n => {
                        const status = useStore.getState().nodes.find(sn => sn.id === n.id)?.data?.status;
                        const st = useStore.getState().nodes.find(sn => sn.id === n.id)?.data?.metrics as any;
                        if (!st) return null;
                        return (
                          <tr key={n.id} className="border-b border-border/50 hover:bg-code-bg/50 transition-colors">
                            <td className="p-3 font-medium">{n.data.label as string}</td>
                            <td className="p-3 text-text-muted text-xs font-mono">{n.data.operation as string}</td>
                            <td className="p-3 font-mono font-bold text-accent">{st.duration_ms}ms</td>
                            <td className="p-3">
                              {st.cached ? <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold border border-green-500/20">HIT</span> : <span className="text-text-muted text-xs">MISS</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-sm font-bold text-text-h mt-4 mb-2">DuckDB Explain Plan</h3>
                <pre className="text-xs font-mono text-text p-4 bg-code-bg rounded-md border border-border overflow-auto">{explainPlan || 'Run pipeline to see execution plan.'}</pre>
             </div>
          )}

          {activeConsoleTab === ('history' as any) && (
             <HistoryViewer projectId={projectId} />
          )}

          {activeConsoleTab === ('audit' as any) && (
             <AuditLogs />
          )}

          {activeConsoleTab === 'logs' && (
             <div className="p-4 font-mono text-sm text-text-h h-full flex flex-col gap-1">
               {executionLogs.length > 0 ? executionLogs.map((log, i) => (
                 <span key={i} className={log.includes('[ERROR]') ? 'text-red-400' : 'text-green-400'}>
                   {log}
                 </span>
               )) : <p>No logs yet.</p>}
             </div>
          )}
        </div>
      </footer>
  );
}
