import React from 'react';
import { Database, FolderOpen, Save, ListTree, Sparkles, Folders, Variable, KeyRound, Sun, Moon, Play, ArrowLeft } from 'lucide-react';

export interface TopBarProps {
  onBack?: () => void;
  openMenu: 'file' | 'edit' | 'settings' | null;
  setOpenMenu: (menu: 'file' | 'edit' | 'settings' | null) => void;
  pipelineFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleLoadPipelineFromFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSavePipelineToFile: () => void;
  setNodes: (nodes: any[]) => void;
  autoLayout: () => void;
  handleMagicLayout: () => void;
  groupNodes: () => void;
  alignLeft: () => void;
  alignTop: () => void;
  distributeHorizontally: () => void;
  setShowVariablesModal: (show: boolean) => void;
  setShowCredentialsModal: (show: boolean) => void;
  theme?: string;
  mounted: boolean;
  setTheme: (theme: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchNode: (e: React.FormEvent) => void;
  handleRunPipeline: () => void;
  isRunning: boolean;
  userRole?: string;
}

export default function TopBar(props: TopBarProps) {
  const {
    onBack, openMenu, setOpenMenu, pipelineFileInputRef, handleLoadPipelineFromFile,
    handleSavePipelineToFile, setNodes, autoLayout, handleMagicLayout, groupNodes,
    alignLeft, alignTop, distributeHorizontally, setShowVariablesModal, setShowCredentialsModal,
    theme, mounted, setTheme, searchQuery, setSearchQuery, handleSearchNode, handleRunPipeline, isRunning, userRole
  } = props;

  return (
    <header className="flex items-center justify-between px-6 py-2 bg-bg border-b border-border z-20 relative shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-1.5 hover:bg-code-bg rounded-md text-text-muted hover:text-text transition-colors mr-2"
                title="Back to Projects"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Database className="w-5 h-5 text-accent" />
            <h1 className="text-sm font-bold text-text-h tracking-tight">Data Architect</h1>
          </div>
          
          {/* Menu System */}
          <div className="flex items-center gap-1 text-sm font-medium relative">
            <div className="relative">
              <button onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); setOpenMenu(openMenu === 'file' ? null : 'file'); }} className={`px-3 py-1.5 rounded-md transition-colors ${openMenu === 'file' ? 'bg-code-bg text-accent' : 'hover:bg-code-bg text-text-muted hover:text-text'}`}>File</button>
              {openMenu === 'file' && (
                <div onClick={(e) => e.nativeEvent.stopImmediatePropagation()} className="absolute top-full mt-1 left-0 w-48 bg-code-bg border border-border rounded-lg shadow-xl overflow-hidden py-1 z-50">
                  <button onClick={() => { pipelineFileInputRef.current?.click(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><FolderOpen className="w-4 h-4"/> Open Pipeline...</button>
                  <button onClick={() => { handleSavePipelineToFile(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><Save className="w-4 h-4"/> Save Pipeline As...</button>
                  <div className="h-px bg-border my-1" />
                  <button onClick={() => { setNodes([]); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-500 hover:text-white text-red-400 flex items-center gap-2 text-xs">Clear Canvas</button>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); setOpenMenu(openMenu === 'edit' ? null : 'edit'); }} className={`px-3 py-1.5 rounded-md transition-colors ${openMenu === 'edit' ? 'bg-code-bg text-accent' : 'hover:bg-code-bg text-text-muted hover:text-text'}`}>Layout</button>
              {openMenu === 'edit' && (
                <div onClick={(e) => e.nativeEvent.stopImmediatePropagation()} className="absolute top-full mt-1 left-0 w-56 bg-code-bg border border-border rounded-lg shadow-xl overflow-hidden py-1 z-50">
                  <button onClick={() => { autoLayout(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><ListTree className="w-4 h-4"/> Auto Layout</button>
                  <button onClick={() => { handleMagicLayout(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><Sparkles className="w-4 h-4"/> Magic Layout</button>
                  <div className="h-px bg-border my-1" />
                  <button onClick={() => { groupNodes(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><Folders className="w-4 h-4"/> Group Selected</button>
                  <div className="h-px bg-border my-1" />
                  <div className="px-4 py-1 text-[10px] text-text-muted font-bold uppercase tracking-wider">Align Options</div>
                  <button onClick={() => { alignLeft(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white text-xs pl-8">Align Left</button>
                  <button onClick={() => { alignTop(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white text-xs pl-8">Align Top</button>
                  <button onClick={() => { distributeHorizontally(); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white text-xs pl-8">Distribute Horizontally</button>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); setOpenMenu(openMenu === 'settings' ? null : 'settings'); }} className={`px-3 py-1.5 rounded-md transition-colors ${openMenu === 'settings' ? 'bg-code-bg text-accent' : 'hover:bg-code-bg text-text-muted hover:text-text'}`}>Settings</button>
              {openMenu === 'settings' && (
                <div onClick={(e) => e.nativeEvent.stopImmediatePropagation()} className="absolute top-full mt-1 left-0 w-48 bg-code-bg border border-border rounded-lg shadow-xl overflow-hidden py-1 z-50">
                  <button onClick={() => { setShowVariablesModal(true); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><Variable className="w-4 h-4"/> Global Variables</button>
                  <button onClick={() => { setShowCredentialsModal(true); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs"><KeyRound className="w-4 h-4"/> Credentials</button>
                  <div className="h-px bg-border my-1" />
                  <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 text-xs">
                    {mounted && theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} Toggle Theme
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input 
            type="file" 
            ref={pipelineFileInputRef} 
            accept=".json" 
            onChange={handleLoadPipelineFromFile} 
            className="hidden" 
          />
          
          <form onSubmit={handleSearchNode} className="flex items-center border border-border bg-code-bg rounded-md overflow-hidden h-8 w-64 transition-all focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
            <div className="pl-2 pr-1 text-text-muted"><Sparkles className="w-3.5 h-3.5" /></div>
            <input 
              type="text" 
              placeholder="Search pipeline nodes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs focus:outline-none w-full text-text placeholder:text-text-muted/50"
            />
          </form>

          {userRole === 'SUPERUSER' && (
             <button onClick={() => window.location.href = '/admin'} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors">
               Admin
             </button>
          )}

          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-code-bg text-text-muted border border-border hover:text-text hover:border-text-muted transition-colors">
            Log Out
          </button>

          <button onClick={handleRunPipeline} disabled={isRunning} className={`px-5 py-1.5 rounded-md font-bold text-sm flex items-center gap-2 shadow-glow transition-all ${isRunning ? 'bg-accent/50 text-white/50 cursor-not-allowed' : 'bg-accent text-white hover-bg-lift hover:shadow-accent/30'}`}>
            {isRunning ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Executing...' : 'Run Pipeline'}
          </button>
        </div>
      </header>
  );
}
