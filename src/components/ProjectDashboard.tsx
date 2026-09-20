"use client";
import { useState, useEffect } from 'react';
import { Folder, Plus, Copy, Trash2, Play, Settings, Database, Code } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  nodeCount: number;
}

interface ProjectDashboardProps {
  onOpenProject: (id: string) => void;
}

export default function ProjectDashboard({ onOpenProject }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ARCHITECT_PROJECTS') || '[]');
      setProjects(stored.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
    } catch {}
  }, []);

  const createProject = () => {
    const name = prompt('Project Name:', 'New Data Pipeline');
    if (!name) return;
    
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name,
      updatedAt: Date.now(),
      nodeCount: 0
    };
    
    // Create empty project state
    localStorage.setItem(`ARCHITECT_PROJ_${newProject.id}`, JSON.stringify({ nodes: [], edges: [] }));
    
    const updated = [newProject, ...projects];
    localStorage.setItem('ARCHITECT_PROJECTS', JSON.stringify(updated));
    setProjects(updated);
    onOpenProject(newProject.id);
  };

  const deleteProject = (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    const updated = projects.filter(p => p.id !== id);
    localStorage.setItem('ARCHITECT_PROJECTS', JSON.stringify(updated));
    localStorage.removeItem(`ARCHITECT_PROJ_${id}`);
    setProjects(updated);
  };

  const duplicateProject = (p: Project) => {
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: `${p.name} (Copy)`,
      updatedAt: Date.now(),
      nodeCount: p.nodeCount
    };
    
    const state = localStorage.getItem(`ARCHITECT_PROJ_${p.id}`);
    if (state) localStorage.setItem(`ARCHITECT_PROJ_${newProject.id}`, state);
    
    const updated = [newProject, ...projects];
    localStorage.setItem('ARCHITECT_PROJECTS', JSON.stringify(updated));
    setProjects(updated);
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full h-screen bg-bg text-text flex flex-col items-center py-12 px-6 overflow-auto">
      <div className="max-w-5xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-text-h flex items-center gap-3">
              <Database className="w-8 h-8 text-accent" /> Local Data Architect
            </h1>
            <p className="text-text-muted">Manage your secure, local-first data pipelines.</p>
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
            className="w-full bg-code-bg border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-accent text-text"
          />
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <div key={p.id} className="bg-code-bg border border-border p-5 rounded-xl flex flex-col gap-4 hover:border-accent/50 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 font-semibold text-text-h text-lg">
                  <Folder className="w-5 h-5 text-accent" />
                  {p.name}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button onClick={() => duplicateProject(p)} className="p-1.5 text-text-muted hover:text-text hover:bg-bg rounded" title="Duplicate"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => deleteProject(p.id)} className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-1 text-sm text-text-muted">
                <div>Nodes: <span className="text-text">{p.nodeCount}</span></div>
                <div>Updated: {formatDistanceToNow(p.updatedAt, { addSuffix: true })}</div>
              </div>
              
              <button 
                onClick={() => onOpenProject(p.id)}
                className="w-full py-2 bg-bg border border-border rounded-lg text-text font-medium flex items-center justify-center gap-2 hover:bg-accent hover:border-accent hover:text-white transition-all"
              >
                <Code className="w-4 h-4" /> Open Editor
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-border rounded-xl">
              <Folder className="w-12 h-12 mb-4 opacity-50" />
              <p>No pipelines found.</p>
              <button onClick={createProject} className="mt-4 text-accent hover:underline">Create your first pipeline</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
