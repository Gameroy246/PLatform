"use client";
import { useEffect, useState } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';

interface AuditLog {
  id: number;
  action: string;
  user: string;
  details: string;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    // In a real implementation this would fetch from /api/audit
    // For now we simulate
    setLogs([
      { id: 1, action: 'PIPELINE_EXECUTED', user: 'admin', details: 'Executed AdHoc Pipeline with 4 nodes', created_at: new Date().toISOString() },
      { id: 2, action: 'CREDENTIAL_ACCESSED', user: 'system', details: 'Accessed MongoDB connection string', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 3, action: 'PIPELINE_SAVED', user: 'admin', details: 'Saved Sales Analytics Template', created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 4, action: 'NODE_DELETED', user: 'admin', details: 'Deleted Parquet Export node', created_at: new Date(Date.now() - 86400000).toISOString() }
    ]);
  }, []);

  return (
    <div className="flex-1 p-6 bg-code-bg overflow-auto h-full text-text">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-text-h">Security Audit Logs</h2>
      </div>
      
      <div className="border border-border rounded-lg bg-bg shadow-shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-code-bg border-b border-border">
            <tr>
              <th className="p-3 font-semibold text-text-muted">Timestamp</th>
              <th className="p-3 font-semibold text-text-muted">Action</th>
              <th className="p-3 font-semibold text-text-muted">User</th>
              <th className="p-3 font-semibold text-text-muted">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-border hover:bg-code-bg/50">
                <td className="p-3 font-mono text-xs text-text-muted">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded text-xs font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">{log.user}</td>
                <td className="p-3">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
