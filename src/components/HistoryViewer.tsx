"use client";
import { useEffect, useState } from 'react';
import { RefreshCw, PlayCircle, XCircle } from 'lucide-react';

interface ExecutionLog {
  id: number;
  pipeline_name: string;
  status: string;
  duration_ms: number;
  node_count: number;
  created_at: string;
}

export default function HistoryViewer() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 bg-code-bg overflow-hidden text-text h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-text-h">Execution History</h2>
        <button onClick={fetchHistory} disabled={loading} className="p-2 hover:bg-bg rounded transition-colors flex items-center gap-2 text-sm text-text-muted hover:text-text">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded-lg bg-bg shadow-shadow">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-code-bg sticky top-0 border-b border-border z-10">
            <tr>
              <th className="p-3 font-semibold text-text-muted">Run ID</th>
              <th className="p-3 font-semibold text-text-muted">Pipeline</th>
              <th className="p-3 font-semibold text-text-muted">Status</th>
              <th className="p-3 font-semibold text-text-muted">Duration</th>
              <th className="p-3 font-semibold text-text-muted">Nodes</th>
              <th className="p-3 font-semibold text-text-muted">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted italic">No execution history found. Run a pipeline to generate logs.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-code-bg/50 transition-colors">
                  <td className="p-3 font-mono text-xs">#{log.id}</td>
                  <td className="p-3 font-medium">{log.pipeline_name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center w-max gap-1 ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {log.status === 'SUCCESS' ? <PlayCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{log.duration_ms}ms</td>
                  <td className="p-3 font-mono">{log.node_count}</td>
                  <td className="p-3 text-text-muted text-xs">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
