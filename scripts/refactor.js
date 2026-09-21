const fs = require('fs');

const typesImport = 'import { PipelineNode, PipelineEdge, PipelineMetadata } from \'../lib/types\';\n';

// TOPBAR
let topbarJsx = fs.readFileSync('d:/Architect/src/components/TopBar.tsx', 'utf8');
const topbarContent = `import React from 'react';
import { Database, FolderOpen, Save, ListTree, Sparkles, Folders, Variable, KeyRound, Sun, Moon, Play, ArrowLeft } from 'lucide-react';
${typesImport}

export interface TopBarProps {
  onBack?: () => void;
  openMenu: 'file' | 'edit' | 'settings' | null;
  setOpenMenu: (menu: 'file' | 'edit' | 'settings' | null) => void;
  pipelineFileInputRef: React.RefObject<HTMLInputElement>;
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
}

export default function TopBar(props: TopBarProps) {
  const {
    onBack, openMenu, setOpenMenu, pipelineFileInputRef, handleLoadPipelineFromFile,
    handleSavePipelineToFile, setNodes, autoLayout, handleMagicLayout, groupNodes,
    alignLeft, alignTop, distributeHorizontally, setShowVariablesModal, setShowCredentialsModal,
    theme, mounted, setTheme, searchQuery, setSearchQuery, handleSearchNode, handleRunPipeline, isRunning
  } = props;

  return (
    ${topbarJsx}
  );
}
`;
fs.writeFileSync('d:/Architect/src/components/TopBar.tsx', topbarContent);

// SIDEBAR
let sidebarJsx = fs.readFileSync('d:/Architect/src/components/Sidebar.tsx', 'utf8');
const sidebarContent = `import React from 'react';
import { Star, ChevronDown, ChevronRight, FileInput, Filter, ArrowRightLeft, Calculator, FolderOutput } from 'lucide-react';
${typesImport}

export interface SidebarProps {
  sidebarSearch: string;
  setSidebarSearch: (search: string) => void;
  labelMap: Record<string, string>;
  macros: any[];
  onDragStart: (event: React.DragEvent, type: string, operation?: string) => void;
  saveMacro: () => void;
  favorites: string[];
  toggleCategory: (cat: string) => void;
  expandedCategories: Record<string, boolean>;
}

export default function Sidebar(props: SidebarProps) {
  const {
    sidebarSearch, setSidebarSearch, labelMap, macros, onDragStart, saveMacro,
    favorites, toggleCategory, expandedCategories
  } = props;

  return (
    ${sidebarJsx.replace(/onDragStart={\(e\) => onDragStart\(e/g, 'onDragStart={(e: any) => onDragStart(e')}
  );
}
`;
fs.writeFileSync('d:/Architect/src/components/Sidebar.tsx', sidebarContent);

// BOTTOM PANEL
let bottomPanelJsx = fs.readFileSync('d:/Architect/src/components/BottomPanel.tsx', 'utf8');
const bottomPanelContent = `import React from 'react';
import { FolderOutput, FileInput, TerminalSquare, Activity, PieChart, LayoutGrid, ShieldCheck, Code } from 'lucide-react';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import Dashboard from './Dashboard';
import DataProfiler from './DataProfiler';
import HistoryViewer from './HistoryViewer';
import AuditLogs from './AuditLogs';
import { generateNodeSQL, generateProductionSQL } from '../lib/sqlGenerator';
import { useStore } from '../store';
import axios from 'axios';
${typesImport}

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
  showToast: (msg: string, type: string) => void;
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
    ${bottomPanelJsx}
  );
}
`;
fs.writeFileSync('d:/Architect/src/components/BottomPanel.tsx', bottomPanelContent);

// CANVAS
let canvasContent = fs.readFileSync('d:/Architect/src/components/Canvas.tsx', 'utf8');
canvasContent = canvasContent.replace(
  /useEffect\(\(\) => \{\n\s+if \(projectId\) \{\n\s+const storageKey = `ARCHITECT_PROJ_\$\{projectId\}`;\n\s+const savedPipeline = localStorage.getItem\(storageKey\);/,
  `useEffect(() => {
    const fetchProj = async () => {
      if (projectId) {
        const storageKey = \`ARCHITECT_PROJ_\${projectId}\`;
        const savedPipeline = await loadProjectData(projectId);`
);
canvasContent = canvasContent.replace(
  /setActiveConsoleTab\(layout.activeConsoleTab\);\n\s+setIsWelcomeModalOpen\(false\);\n\s+\}\n\s+\} catch \(e\) \{\}\n\s+\}\n\s+\}\n\s+\}, \[projectId\]\);/,
  `setActiveConsoleTab(layout.activeConsoleTab);
            setIsWelcomeModalOpen(false);
          }
        } catch (e) {}
      }
    };
    fetchProj();
  }, [projectId]);`
);
fs.writeFileSync('d:/Architect/src/components/Canvas.tsx', canvasContent);

console.log('Finished refactoring scripts!');
