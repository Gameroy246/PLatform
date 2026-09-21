"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Plus, Trash2, Edit, Save, ArrowLeft } from 'lucide-react';


export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 401 || res.status === 403) {
         onBack();
         return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    const email = prompt("Enter new user's email:");
    if (!email) return;
    const password = prompt("Enter a temporary password:");
    if (!password) return;
    const role = prompt("Enter role (SUPERUSER, ADMIN, EDITOR, VIEWER):", "EDITOR");
    
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: role?.toUpperCase() })
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeRole = async (id: string, currentRole: string) => {
    const role = prompt("Enter new role (SUPERUSER, ADMIN, EDITOR, VIEWER):", currentRole);
    if (!role) return;
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: role.toUpperCase() })
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <header className="h-14 border-b border-border bg-code-bg px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onBack()} className="p-1.5 hover:bg-bg rounded transition-colors mr-2">
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </button>
          <div className="flex items-center justify-center w-8 h-8 rounded bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-h">Superuser Dashboard</h1>
            <p className="text-[10px] text-text-muted">System Administration & RBAC</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              User Management
            </h2>
            <button onClick={handleCreateUser} className="px-3 py-1.5 bg-accent text-white rounded text-sm font-medium flex items-center gap-2 hover:opacity-90">
              <Plus className="w-4 h-4" /> Create User
            </button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-code-bg">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg border-b border-border">
                <tr>
                  <th className="p-3 text-text-muted font-semibold">User ID</th>
                  <th className="p-3 text-text-muted font-semibold">Email</th>
                  <th className="p-3 text-text-muted font-semibold">Role</th>
                  <th className="p-3 text-text-muted font-semibold">MFA Enabled</th>
                  <th className="p-3 text-text-muted font-semibold">Features</th>
                  <th className="p-3 text-text-muted font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-text-muted">Loading users...</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-bg/50">
                    <td className="p-3 font-mono text-xs text-text-muted">{user.id}</td>
                    <td className="p-3 font-medium">{user.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.role === 'SUPERUSER' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {user.mfa_enabled ? <span className="text-green-500 text-xs font-bold">YES</span> : <span className="text-text-muted text-xs">NO</span>}
                    </td>
                    <td className="p-3 text-xs text-text-muted">
                      {(() => {
                         try { 
                           const feats = JSON.parse(user.features);
                           return Array.isArray(feats) ? feats.join(', ') : 'None';
                         } catch(e) { return 'None'; }
                      })()}
                    </td>
                    <td className="p-3 flex items-center justify-end gap-2">
                      <button onClick={async () => {
                         let feats: string[] = [];
                         try { feats = JSON.parse(user.features); } catch(e){}
                         const newFeats = prompt("Enter comma-separated features (e.g. export,ai_node):", feats.join(', '));
                         if (newFeats !== null) {
                            await fetch('/api/admin/users', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: user.id, features: newFeats.split(',').map(f => f.trim()).filter(Boolean) }) });
                            fetchUsers();
                         }
                      }} className="px-2 py-1 bg-code-bg border border-border rounded text-[10px] font-semibold text-text-muted hover:text-text" title="Modify Features">
                        Features
                      </button>
                      <button onClick={() => handleChangeRole(user.id, user.role)} className="p-1.5 text-text-muted hover:text-accent rounded hover:bg-bg" title="Change Role">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-text-muted hover:text-red-500 rounded hover:bg-bg" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
