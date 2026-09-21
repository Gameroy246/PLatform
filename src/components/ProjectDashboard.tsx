"use client";
import { useState, useEffect } from 'react';
import { Folder, Plus, Copy, Trash2, Play, Settings, Database, Code, ShieldAlert, LogOut, User, Share2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Project {
  id: string;
  name: string;
  updated_at: string;
  owner_id: string;
}

interface ProjectDashboardProps {
  user: any;
  onOpenProject: (id: string) => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export default function ProjectDashboard({ user, onOpenProject, onOpenAdmin, onLogout }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingProject, setSharingProject] = useState<Project | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/pipelines');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.pipelines || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    if (user?.role === 'SUPERUSER' || user?.role === 'ADMIN') {
      fetch('/api/admin/users').then(r => r.json()).then(d => {
        if(d.users) setSystemUsers(d.users);
      }).catch(()=>{});
    }
  }, [user]);

  const openShareModal = (p: Project) => {
    setSharingProject(p);
    // Fetch current shared_with status
    fetch(`/api/pipelines?id=${p.id}`).then(r => r.json()).then(d => {
      setSharedWith(d.pipeline?.shared_with || []);
      setShareModalOpen(true);
    }).catch(console.error);
  };

  const saveSharing = async () => {
    if (!sharingProject) return;
    try {
      const res = await fetch('/api/pipelines/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sharingProject.id, shared_with: sharedWith })
      });
      if (res.ok) {
        setShareModalOpen(false);
        setSharingProject(null);
      } else {
        alert('Failed to share project');
      }
    } catch(e) {
      console.error(e);
      alert('Error sharing project');
    }
  };


  const createProject = async () => {
    const name = prompt('Project Name:', 'New Data Pipeline');
    if (!name) return;
    
    const id = `proj_${Date.now()}`;
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, nodes: [], edges: [] })
      });
      if (res.ok) {
        onOpenProject(id);
      } else {
        alert('Failed to create project.');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating project.');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch(`/api/pipelines?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert('Failed to delete project.');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting project.');
    }
  };

  const duplicateProject = async (p: Project) => {
    const newName = `${p.name} (Copy)`;
    const newId = `proj_${Date.now()}`;
    try {
      // First fetch the original project data
      const getRes = await fetch(`/api/pipelines?id=${p.id}`);
      if (!getRes.ok) throw new Error('Failed to fetch original project');
      const data = await getRes.json();
      
      const postRes = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, name: newName, nodes: data.pipeline.data.nodes, edges: data.pipeline.data.edges })
      });
      if (postRes.ok) {
        loadProjects();
      } else {
        alert('Failed to duplicate project.');
      }
    } catch (e) {
      console.error(e);
      alert('Error duplicating project.');
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full h-screen bg-bg text-text flex flex-col items-center py-12 px-6 overflow-auto">
      <div className="absolute top-6 right-6 flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 bg-code-bg px-3 py-1.5 rounded-md border border-border shadow-sm">
            <User className="w-4 h-4 text-accent" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text">{user.name || user.email}</span>
              <span className="text-[10px] text-text-muted">{user.role}</span>
            </div>
          </div>
        )}
        
        {(user?.role === 'SUPERUSER' || user?.role === 'ADMIN') && (
           <button onClick={onOpenAdmin} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1.5">
             <ShieldAlert className="w-4 h-4" /> Admin
           </button>
        )}
        
        <button onClick={onLogout} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-code-bg text-text-muted border border-border hover:text-text hover:border-text-muted transition-colors flex items-center gap-1.5">
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

      <div className="max-w-5xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-text-h flex items-center gap-3">
              <Database className="w-8 h-8 text-accent" /> Local Data Architect
            </h1>
            <p className="text-text-muted">Manage your secure, cloud-synced data pipelines.</p>
          </div>
          <button 
            onClick={createProject}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium flex items-center gap-2 hover-bg-lift shadow-glow"
          >
            <Plus className="w-4 h-4" /> New Pipeline
          </button>
        </div>

        {/* Search */}
        <div className="w-full">
          <input 
            type="text" 
            placeholder="Search pipelines..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-code-bg border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all shadow-sm"
          />
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="text-text-muted text-sm col-span-full">Loading pipelines...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-code-bg/50">
              <Folder className="w-12 h-12 text-text-muted mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-text-h">No pipelines found</h3>
              <p className="text-sm text-text-muted mt-1 mb-4">Create your first data pipeline to get started.</p>
              <button 
                onClick={createProject}
                className="px-4 py-2 bg-accent text-white rounded-md font-medium text-sm hover-bg-lift"
              >
                Create Pipeline
              </button>
            </div>
          ) : (
            filtered.map(p => (
              <div 
                key={p.id} 
                className="group bg-code-bg border border-border rounded-xl p-5 hover:border-accent/50 transition-all shadow-sm hover:shadow-glow flex flex-col gap-4 cursor-pointer"
                onClick={() => onOpenProject(p.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      <Code className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="font-semibold text-text-h truncate" title={p.name}>{p.name}</h3>
                      <span className="text-xs text-text-muted">
                        Updated {p.updated_at ? formatDistanceToNow(new Date(p.updated_at + 'Z'), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted bg-bg px-2 py-1 rounded-md border border-border">
                    {p.owner_id === user?.id ? 'Owner' : 'Shared'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); duplicateProject(p); }}
                      className="p-1.5 text-text-muted hover:text-text hover:bg-bg rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {(p.owner_id === user?.id || user?.role === 'SUPERUSER' || user?.role === 'ADMIN') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); openShareModal(p); }}
                        className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                    {(p.owner_id === user?.id || user?.role === 'SUPERUSER' || user?.role === 'ADMIN') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                        className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {shareModalOpen && sharingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-code-bg border border-border rounded-xl shadow-glow p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-h">Share "{sharingProject.name}"</h3>
              <button onClick={() => setShareModalOpen(false)} className="text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {systemUsers.filter(u => u.id !== sharingProject.owner_id).map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-bg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sharedWith.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSharedWith([...sharedWith, u.id]);
                      else setSharedWith(sharedWith.filter(id => id !== u.id));
                    }}
                    className="rounded border-border bg-bg text-accent focus:ring-accent"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">{u.email}</span>
                    <span className="text-xs text-text-muted">{u.role}</span>
                  </div>
                </label>
              ))}
              {systemUsers.length === 0 && (
                <div className="text-sm text-text-muted italic">Only admins can fetch user lists for sharing right now.</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
              <button 
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 rounded font-medium text-sm text-text-muted hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveSharing}
                className="px-4 py-2 rounded font-medium text-sm bg-accent text-white hover-lift shadow-glow"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
