"use client";
import { useEffect, useState } from 'react';
import { RefreshCw, PlayCircle, XCircle, Clock, History } from 'lucide-react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

interface ExecutionLog {
  id: number;
  pipeline_name: string;
  status: string;
  duration_ms: number;
  node_count: number;
  created_at: string;
}

interface Snapshot {
  id: string;
  timestamp: number;
  nodeCount: number;
  edgeCount: number;
  data: any;
}

export default function HistoryViewer({ projectId }: { projectId?: string }) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'snapshots'>('logs');
  
  const { setNodes, setEdges } = useStore(useShallow(state => ({ setNodes: state.setNodes, setEdges: state.setEdges })));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) setLogs(data.data);
      
      if (projectId) {
        const snaps = JSON.parse(localStorage.getItem(`ARCHITECT_PROJ_${projectId}_SNAPSHOTS`) || '[]');
        setSnapshots(snaps.sort((a: any, b: any) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const saveSnapshot = () => {
    if (!projectId) return;
    const currentData = localStorage.getItem(`ARCHITECT_PROJ_${projectId}`);
    if (!currentData) return;
    
    const parsed = JSON.parse(currentData);
    
    const newSnapshot: Snapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      nodeCount: parsed.savedNodes?.length || 0,
      edgeCount: parsed.savedEdges?.length || 0,
      data: parsed
    };
    
    const updated = [newSnapshot, ...snapshots];
    localStorage.setItem(`ARCHITECT_PROJ_${projectId}_SNAPSHOTS`, JSON.stringify(updated));
    setSnapshots(updated);
  };

  const restoreSnapshot = (snap: Snapshot) => {
    if (!confirm('Are you sure you want to restore this snapshot? Current unsaved changes will be lost.')) return;
    setNodes(snap.data.savedNodes || []);
    setEdges(snap.data.savedEdges || []);
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-code-bg overflow-hidden text-text h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4 border-b border-border w-1/2">
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 font-bold flex items-center gap-2 ${activeTab === 'logs' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text'}`}
          >
            <PlayCircle className="w-4 h-4" /> Execution Logs
          </button>
          <button 
            onClick={() => setActiveTab('snapshots')}
            className={`px-4 py-2 font-bold flex items-center gap-2 ${activeTab === 'snapshots' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text'}`}
          >
            <History className="w-4 h-4" /> Version Snapshots
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'snapshots' && (
            <button onClick={saveSnapshot} className="px-3 py-1.5 bg-accent text-white rounded text-sm font-medium hover-bg-lift shadow-glow">
              Take Snapshot
            </button>
          )}
          <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-bg rounded transition-colors flex items-center gap-2 text-sm text-text-muted hover:text-text">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded-lg bg-bg shadow-shadow">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-code-bg sticky top-0 border-b border-border z-10">
            {activeTab === 'logs' ? (
              <tr>
                <th className="p-3 font-semibold text-text-muted">Run ID</th>
                <th className="p-3 font-semibold text-text-muted">Pipeline</th>
                <th className="p-3 font-semibold text-text-muted">Status</th>
                <th className="p-3 font-semibold text-text-muted">Duration</th>
                <th className="p-3 font-semibold text-text-muted">Nodes</th>
                <th className="p-3 font-semibold text-text-muted">Timestamp</th>
              </tr>
            ) : (
              <tr>
                <th className="p-3 font-semibold text-text-muted">Snapshot ID</th>
                <th className="p-3 font-semibold text-text-muted">Timestamp</th>
                <th className="p-3 font-semibold text-text-muted">Nodes</th>
                <th className="p-3 font-semibold text-text-muted">Edges</th>
                <th className="p-3 font-semibold text-text-muted text-right">Action</th>
              </tr>
            )}
          </thead>
          <tbody>
            {activeTab === 'logs' ? (
              logs.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-text-muted italic">No execution history found.</td></tr>
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
              )
            ) : (
              snapshots.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-text-muted italic">No snapshots found. Take a snapshot to save the current state.</td></tr>
              ) : (
                snapshots.map((snap) => (
                  <tr key={snap.id} className="border-b border-border hover:bg-code-bg/50 transition-colors">
                    <td className="p-3 font-mono text-xs text-text-muted">{snap.id}</td>
                    <td className="p-3 flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> {new Date(snap.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-mono">{snap.nodeCount}</td>
                    <td className="p-3 font-mono">{snap.edgeCount}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => restoreSnapshot(snap)}
                        className="px-3 py-1 bg-code-bg border border-border text-text hover:text-accent hover:border-accent rounded transition-colors text-xs font-medium"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
