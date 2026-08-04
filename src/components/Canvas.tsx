"use client";
import { useState } from 'react';
import type { DragEvent } from 'react'; // FIXED: Strict type import
import axios from 'axios';
import { ReactFlow, MiniMap, Controls, Background, BackgroundVariant, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRef } from 'react';
import { Play, Database, ChevronDown, ChevronRight, FileInput, Filter, Calculator, ArrowRightLeft, FolderOutput, Sun, Moon, Star, Save, Download, FolderOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import { useStore } from '../store';
import DataSourceNode from './DataSourceNode';
import TransformNode from './TransformNode';
import StickyNoteNode from './StickyNoteNode';
import PropertiesPanel from './PropertiesPanel';
import CommandPalette from './CommandPalette';
import Dashboard from './Dashboard';
import { useEffect } from 'react';
import { generateNodeSQL } from '../lib/sqlGenerator';
import HistoryViewer from './HistoryViewer';
import WelcomeModal from './WelcomeModal';
import AuditLogs from './AuditLogs';
import SettingsModal from './SettingsModal';
import { Settings, Sparkles, Folders } from 'lucide-react';

const labelMap: Record<string, string> = {
  csvInput: 'CSV Input',
  jsonInput: 'JSON Input',
  parquetInput: 'Parquet Input',
  excelInput: 'Excel Input',
  postgresInput: 'PostgreSQL Input',
  mysqlInput: 'MySQL Input',
  sqlserverInput: 'SQL Server Input',
  mongodbInput: 'MongoDB Input',
  restApiInput: 'REST API',
  graphQLInput: 'GraphQL',
  xmlInput: 'XML Input',
  avroInput: 'Avro Input',
  arrowInput: 'Arrow Input',
  orcInput: 'ORC Input',
  featherInput: 'Feather Input',
  fixedWidthInput: 'Fixed Width',
  sqliteInput: 'SQLite DB',
  duckdbInput: 'DuckDB File',
  
  removeDuplicates: 'Remove Duplicates',
  removeNulls: 'Remove Nulls',
  fillMissing: 'Fill Missing',
  typeConversion: 'Type Cast',
  trimWhitespace: 'Trim Space',
  textCasing: 'Text Casing',
  replaceText: 'Replace Text',
  regexExtract: 'Regex Extract',
  dropColumns: 'Drop Columns',
  renameColumn: 'Rename Column',
  
  filterRows: 'Filter Rows',
  sortRows: 'Sort Rows',
  topN: 'Top N',
  sampleRows: 'Sample Rows',
  dateTruncate: 'Date Truncate',
  dateArithmetic: 'Date Arithmetic',
  conditionalLogic: 'If/Then Logic',
  splitPart: 'Split Part',
  stringLength: 'String Length',
  
  innerJoin: 'Inner Join',
  leftJoin: 'Left Join',
  selfJoin: 'Self Join',
  unionAll: 'Union All',
  
  groupBy: 'Group By',
  windowFunction: 'Window Func',
  pivotTable: 'Pivot Table',
  unpivotTable: 'Unpivot/Melt',
  rollup: 'Rollup',
  summaryStats: 'Summary Stats',
  medianAgg: 'Median',
  modeAgg: 'Mode',
  stdDevAgg: 'Std Dev',
  varianceAgg: 'Variance',
  correlationMatrix: 'Correlation Matrix',
  movingAverage: 'Moving Average',
  runningTotal: 'Running Total',
  normalizeColumn: 'Normalize',
  standardizeColumn: 'Standardize',
  regexMatch: 'Regex Match',
  dataContract: 'Data Contract',
  autoMap: 'Auto Column Map',
  
  mathFormula: 'Math Formula',
  extractYear: 'Extract Year',
  customSql: 'Custom SQL',
  exportCsv: 'Export CSV',
};

const nodeTypes = {
  dataSource: DataSourceNode,
  transform: TransformNode,
  stickyNote: StickyNoteNode,
};

import { useTheme } from 'next-themes';
export default function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onSelectionChange, addNode, updateNodeData, undo, redo, deleteSelected, duplicateSelected, setNodeStatuses, setNodes, setEdges, favorites, setFavorites } = useStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'sql' | 'logs' | 'dashboard'>('sql');
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState('csv');
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  useEffect(() => { 
    setMounted(true); 
    setApiKey(localStorage.getItem('GEMINI_API_KEY') || ''); 
    
    const savedFavs = localStorage.getItem('ARCHITECT_FAVORITES');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }
    
    // Phase 6: Load Workspace Layout Persistence
  }, [setNodes, setEdges]);

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Init from Local Storage
  useEffect(() => {
    const savedPipeline = localStorage.getItem('ARCHITECT_PIPELINE');
    // We do NOT load immediately, we let the welcome modal decide
  }, []);

  const handleLoadTemplate = (templateId: string) => {
    setIsWelcomeModalOpen(false);
    if (templateId === 'etl') {
      setNodes([
        { id: 't1', type: 'dataSource', position: { x: 100, y: 100 }, data: { operation: 'csvInput', label: 'CSV Input', file: 'data.csv', sql: "SELECT * FROM read_csv_auto('data.csv')" } },
        { id: 't2', type: 'transform', position: { x: 400, y: 100 }, data: { operation: 'removeNulls', label: 'Remove Nulls', sql: 'SELECT * FROM {parent} WHERE column_name IS NOT NULL' } },
        { id: 't3', type: 'transform', position: { x: 700, y: 100 }, data: { operation: 'exportCsv', label: 'Export Parquet', file: 'output.parquet' } }
      ]);
      setEdges([
        { id: 'e1', source: 't1', target: 't2', animated: true },
        { id: 'e2', source: 't2', target: 't3', animated: true }
      ]);
    } else if (templateId === 'analytics') {
       setNodes([
        { id: 't1', type: 'dataSource', position: { x: 100, y: 50 }, data: { operation: 'sqliteInput', label: 'Sales DB' } },
        { id: 't2', type: 'dataSource', position: { x: 100, y: 200 }, data: { operation: 'jsonInput', label: 'Products JSON' } },
        { id: 't3', type: 'transform', position: { x: 400, y: 125 }, data: { operation: 'innerJoin', label: 'Inner Join' } },
        { id: 't4', type: 'transform', position: { x: 700, y: 125 }, data: { operation: 'groupBy', label: 'Group By Category' } }
      ]);
      setEdges([
        { id: 'e1', source: 't1', target: 't3', sourceHandle: 'out', targetHandle: 'in1', animated: true },
        { id: 'e2', source: 't2', target: 't3', sourceHandle: 'out', targetHandle: 'in2', animated: true },
        { id: 'e3', source: 't3', target: 't4', animated: true }
      ]);
    }
  };

  const pipelineFileInputRef = useRef<HTMLInputElement>(null);

  const handleSavePipelineToFile = () => {
    if (nodes.length === 0) {
      showToast("Canvas is empty. Nothing to save.", "error");
      return;
    }
    const data = JSON.stringify({ version: "1.0", savedNodes: nodes, savedEdges: edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Pipeline saved to JSON file!", "success");
  };

  const sanitizeEdges = (rawEdges: any[]) => {
    return (rawEdges || []).map((e: any) => {
      const clean = { ...e };
      if (['out', 'in1', 'in2'].includes(clean.sourceHandle)) delete clean.sourceHandle;
      if (['out', 'in1', 'in2'].includes(clean.targetHandle)) delete clean.targetHandle;
      return clean;
    });
  };

  const handleLoadPipelineFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const loadedNodes = parsed.savedNodes || parsed.nodes || [];
        const loadedEdges = parsed.savedEdges || parsed.edges || [];

        if (!Array.isArray(loadedNodes)) {
          showToast("Invalid pipeline file format.", "error");
          return;
        }

        setNodes(loadedNodes);
        setEdges(sanitizeEdges(loadedEdges));
        setIsWelcomeModalOpen(false);
        showToast(`Loaded pipeline with ${loadedNodes.length} nodes!`, "success");
      } catch (err: any) {
        console.error("Failed to parse pipeline file:", err);
        showToast("Error parsing pipeline JSON file.", "error");
      }
    };
    reader.readAsText(file);
    if (pipelineFileInputRef.current) pipelineFileInputRef.current.value = "";
  };

  const handleOpenRecent = () => {
    setIsWelcomeModalOpen(false);
    const savedPipeline = localStorage.getItem('ARCHITECT_PIPELINE');
    if (savedPipeline) {
      try {
        const { savedNodes, savedEdges, savedFavorites } = JSON.parse(savedPipeline);
        if (savedNodes && savedNodes.length > 0) {
          setNodes(savedNodes || []);
          setEdges(sanitizeEdges(savedEdges || []));
          setFavorites(savedFavorites || []);
          setMacros(JSON.parse(localStorage.getItem('ARCHITECT_MACROS') || '[]'));
        }
      } catch (e) {
        console.error("Failed to load pipeline from localStorage", e);
      }
    }
  };

  // Phase 6: Save Workspace Layout Persistence
  useEffect(() => {
    if (mounted && nodes.length > 0) {
      const saveTimer = setTimeout(() => {
        localStorage.setItem('ARCHITECT_PIPELINE', JSON.stringify({ savedNodes: nodes, savedEdges: edges }));
      }, 500); // debounce save
      return () => clearTimeout(saveTimer);
    }
  }, [nodes, edges, mounted]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Input': true,
    'Cleaning': true,
    'Transformation': true,
    'Aggregation': true,
    'Export': true
  });
  
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };
  
  const selectedNode = nodes.find(n => n.selected) || null;
  
  const [sqlOutput, setSqlOutput] = useState("");
  const [explainPlan, setExplainPlan] = useState("");
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [inputPreviewData, setInputPreviewData] = useState<any[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [pipelineMetadata, setPipelineMetadata] = useState<any>(null);
  const [panelWidth, setPanelWidth] = useState(288);
  const [consoleHeight, setConsoleHeight] = useState(256);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isResizingConsole, setIsResizingConsole] = useState(false);
  
  const [activeConsoleTab, setActiveConsoleTab] = useState<'output' | 'input' | 'sql' | 'dashboard' | 'logs'>('output');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [macros, setMacros] = useState<any[]>([]);

  const alignLeft = () => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) return;
    const minX = Math.min(...selectedNodes.map(n => n.position.x));
    setNodes(nodes.map(n => n.selected ? { ...n, position: { ...n.position, x: minX } } : n));
  };
  
  const alignTop = () => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) return;
    const minY = Math.min(...selectedNodes.map(n => n.position.y));
    setNodes(nodes.map(n => n.selected ? { ...n, position: { ...n.position, y: minY } } : n));
  };

  const distributeHorizontally = () => {
    const selectedNodes = nodes.filter(n => n.selected).sort((a,b) => a.position.x - b.position.x);
    if (selectedNodes.length < 3) return;
    const firstX = selectedNodes[0].position.x;
    const lastX = selectedNodes[selectedNodes.length - 1].position.x;
    const step = (lastX - firstX) / (selectedNodes.length - 1);
    
    setNodes(nodes.map(n => {
      const idx = selectedNodes.findIndex(sn => sn.id === n.id);
      if (idx === -1 || idx === 0 || idx === selectedNodes.length - 1) return n;
      return { ...n, position: { ...n.position, x: firstX + (step * idx) } };
    }));
  };

  const saveMacro = () => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return showToast('Select nodes to create a macro', 'warning');
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const internalEdges = edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
    
    const macroName = prompt('Enter a name for this Macro:');
    if (!macroName) return;
    
    const newMacro = {
       id: `macro_${Date.now()}`,
       name: macroName,
       nodes: selectedNodes,
       edges: internalEdges
    };
    
    const existing = JSON.parse(localStorage.getItem('ARCHITECT_MACROS') || '[]');
    const updated = [...existing, newMacro];
    localStorage.setItem('ARCHITECT_MACROS', JSON.stringify(updated));
    setMacros(updated);
    showToast(`Macro '${macroName}' saved successfully`, 'success');
  };

  const groupNodes = () => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) return showToast('Select at least 2 nodes to group', 'warning');
    
    const minX = Math.min(...selectedNodes.map(n => n.position.x)) - 20;
    const minY = Math.min(...selectedNodes.map(n => n.position.y)) - 40;
    const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.measured?.width || 250))) + 20;
    const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.measured?.height || 100))) + 20;
    
    const groupId = `group_${Date.now()}`;
    const groupName = prompt('Enter group name:', 'New Group');
    if (!groupName) return;
    
    const groupNode = {
      id: groupId,
      type: 'group',
      position: { x: minX, y: minY },
      style: { width: maxX - minX, height: maxY - minY, backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '2px dashed #6b7280', borderRadius: '8px' },
      data: { label: groupName },
    };
    
    const updatedNodes = nodes.map(n => {
      if (n.selected) {
        return {
          ...n,
          parentNode: groupId,
          extent: 'parent' as const,
          position: { x: n.position.x - minX, y: n.position.y - minY },
          selected: false
        };
      }
      return n;
    });
    
    setNodes([groupNode, ...updatedNodes]);
    showToast(`Group '${groupName}' created`, 'success');
  };

  const autoLayout = () => {
    if (nodes.length === 0) return;
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    const depth: Record<string, number> = {};

    nodes.forEach(n => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
      depth[n.id] = 0;
    });

    edges.forEach(e => {
      if (adj[e.source] && inDegree[e.target] !== undefined) {
        adj[e.source].push(e.target);
        inDegree[e.target]++;
      }
    });

    const queue: string[] = [];
    nodes.forEach(n => {
      if (inDegree[n.id] === 0) queue.push(n.id);
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currDepth = depth[curr];
      adj[curr]?.forEach(child => {
        depth[child] = Math.max(depth[child] || 0, currDepth + 1);
        inDegree[child]--;
        if (inDegree[child] === 0) queue.push(child);
      });
    }

    const depthGroups: Record<number, string[]> = {};
    nodes.forEach(n => {
      const d = depth[n.id] || 0;
      if (!depthGroups[d]) depthGroups[d] = [];
      depthGroups[d].push(n.id);
    });

    const newNodes = nodes.map(n => {
      const d = depth[n.id] || 0;
      const group = depthGroups[d];
      const index = group.indexOf(n.id);
      return {
        ...n,
        position: {
          x: d * 280 + 50,
          y: index * 130 + 50
        }
      };
    });

    useStore.setState({ nodes: newNodes });
    showToast("Auto-layout applied!", "success");
  };

  const fetchInputPreview = async () => {
    if (!selectedNode) {
      showToast("Select a node first", "warning");
      return;
    }
    const parentEdges = edges.filter(e => e.target === selectedNode.id);
    if (parentEdges.length === 0) {
      showToast("This node has no input (it is a source node).", "warning");
      return;
    }
    try {
      showToast("Fetching input preview...", "success");
      const mappedNodes = nodes.map(n => ({ id: n.id, sql: generateNodeSQL(n, edges) }));
      const payload = { nodes: mappedNodes, edges, targetNodeId: parentEdges[0].source };
      const res = await axios.post('/api/preview', payload);
      setInputPreviewData(res.data.preview.sample_data);
    } catch (e: any) {
      showToast(e.response?.data?.error || "Failed to fetch input preview", "error");
    }
  };

  useEffect(() => {
    if (!selectedNode) return;
    
    const abortController = new AbortController();
    
    const timeout = setTimeout(async () => {
      try {
        const mappedNodes = nodes.map(n => ({ id: n.id, sql: generateNodeSQL(n, edges) }));
        
        // Fetch output preview
        const payload = { nodes: mappedNodes, edges, targetNodeId: selectedNode.id };
        const res = await axios.post('/api/preview', payload, { signal: abortController.signal });
        if (res.data?.preview?.sample_data) {
           setPreviewData(res.data.preview.sample_data);
        }
        
        // Fetch input preview (from first parent) — only if output succeeded
        if (abortController.signal.aborted) return;
        const parentEdges = edges.filter(e => e.target === selectedNode.id);
        if (parentEdges.length > 0) {
           const inPayload = { nodes: mappedNodes, edges, targetNodeId: parentEdges[0].source };
           const inRes = await axios.post('/api/preview', inPayload, { signal: abortController.signal });
           if (inRes.data?.preview?.sample_data) {
              setInputPreviewData(inRes.data.preview.sample_data);
           }
        } else {
           setInputPreviewData([]);
        }
      } catch (e: any) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return; // expected abort
        // Silently catch auto-preview errors to not spam the user while typing
      }
    }, 800);
    
    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [nodes, edges, selectedNode?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingPanel) {
        setPanelWidth(Math.max(200, Math.min(600, window.innerWidth - e.clientX)));
      }
      if (isResizingConsole) {
        setConsoleHeight(Math.max(100, Math.min(800, window.innerHeight - e.clientY)));
      }
    };
    const handleMouseUp = () => {
      setIsResizingPanel(false);
      setIsResizingConsole(false);
    };
    
    if (isResizingPanel || isResizingConsole) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [undo, redo, duplicateSelected, deleteSelected, isResizingPanel, isResizingConsole]);

  const onDragStart = (event: DragEvent, nodeType: string, operation?: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, operation }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const dataStr = event.dataTransfer.getData('application/reactflow');
    if (!dataStr) return;
    
    let parsedData = { type: 'default', operation: 'customSql' };
    try {
      parsedData = JSON.parse(dataStr);
    } catch {
      parsedData.type = dataStr; // Fallback
    }

    const { type, operation } = parsedData;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    if (type === 'macro') {
      const macro = macros.find(m => m.id === operation);
      if (!macro) return showToast('Macro not found', 'error');
      
      const idMap: Record<string, string> = {};
      const newNodes = macro.nodes.map((n: any) => {
        const newId = `${n.type}_${Math.random().toString(36).substr(2, 9)}`;
        idMap[n.id] = newId;
        const deltaX = n.position.x - macro.nodes[0].position.x;
        const deltaY = n.position.y - macro.nodes[0].position.y;
        return {
          ...n,
          id: newId,
          selected: false,
          position: { x: position.x + deltaX, y: position.y + deltaY }
        };
      });
      
      const newEdges = macro.edges.map((e: any) => {
        return {
          ...e,
          id: `e_${idMap[e.source]}-${idMap[e.target]}`,
          source: idMap[e.source],
          target: idMap[e.target]
        };
      });
      
      setNodes([...nodes, ...newNodes]);
      setEdges([...edges, ...newEdges]);
      return showToast(`Inserted macro ${macro.name}`, 'success');
    }

    addNodeFromPalette(type, operation || type, position);
  };

  const addNodeFromPalette = (type: string, operation: string, position = { x: 100, y: 100 }) => {

    addNode({
      id: `${operation}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      data: { label: labelMap[operation] || `New ${type}`, operation, file: '', sql: '' },
    });
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleRunPipeline = async () => {
    // Phase 1: Foolproof Validation
    if (nodes.length === 0) {
      showToast("Canvas is empty! Drag some nodes to begin.", "warning");
      return;
    }

    const unconfiguredNodes = nodes.filter(n => 
      ['csvInput', 'jsonInput', 'parquetInput'].includes(n.data.operation as string) && !n.data.file
    );

    if (unconfiguredNodes.length > 0) {
      const nodeStatuses = unconfiguredNodes.reduce((acc: any, node) => {
        acc[node.id] = { status: 'ERROR', error: 'Missing file configuration' };
        return acc;
      }, {});
      setNodeStatuses(nodeStatuses);
      showToast(`Missing configuration in ${unconfiguredNodes.length} node(s)!`, "error");
      return;
    }

    try {
      showToast("Executing pipeline...", "success");
      const mappedNodes = nodes.map(node => {
        const generatedSql = generateNodeSQL(node, edges);
        return { id: node.id, sql: generatedSql };
      });

      const mappedEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target
      }));

      const payload = { nodes: mappedNodes, edges: mappedEdges, output_format: outputFormat };
      const response = await axios.post('/api/run', payload);
      
      const { data } = response;
      setSqlOutput(data.final_sql);
      if (data.explain_plan) setExplainPlan(data.explain_plan);
      setExecutionLogs(Array.isArray(data.logs) ? data.logs : typeof data.logs === 'string' ? data.logs.split('\n') : []);
      setPreviewData(data.sample_result);
      setPipelineMetadata(data.metadata);
      if (data.node_statuses) {
        setNodeStatuses(data.node_statuses);
      }
      setActiveTab('preview'); 
      
      if (data.download_url) {
        setDownloadUrl(data.download_url);
        showToast("Pipeline executed successfully! Auto-saving...", "success");
      }

      try {
        await axios.post('/api/pipelines', { id: 'default-pipeline', name: 'My Main Pipeline', nodes: mappedNodes, edges: mappedEdges });
      } catch(e) {
        console.error("Auto-save failed", e);
      }

    } catch (error: any) {
      console.error(error);
      let msg = error.response?.data?.error || error.response?.data?.detail || error.message;
      
      // Intelligent Error Parsing
      if (msg.includes('Catalog Error: Table with name')) {
        msg = 'One of the parent nodes failed or is disconnected. Make sure upstream nodes are configured correctly.';
      } else if (msg.includes('Catalog Error: Column with name')) {
        const colMatch = msg.match(/Column with name (.+) does not exist/);
        msg = colMatch ? `Column ${colMatch[1]} does not exist in the data at this step. Please select a valid column from the dropdown.` : msg;
      } else if (msg.includes('Parser Error: syntax error at or near')) {
        msg = 'Syntax Error: You might have unmatched quotes or invalid characters in your text input or condition.';
      } else if (msg.includes('Binder Error: Could not convert string')) {
        msg = 'Type Mismatch: You are trying to treat a text string as a number or date, but the data is incompatible.';
      }
      
      setExecutionLogs([`[CRITICAL] Execution Failed: ${msg}`]);
      showToast(`Pipeline failed: ${msg}`, 'error');
      
      if (error.response?.data?.node_statuses) {
        setNodeStatuses(error.response.data.node_statuses);
      }
      
      setActiveTab('logs');
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-bg text-text font-sans overflow-hidden">
      <CommandPalette onAddNode={addNodeFromPalette} onRunPipeline={handleRunPipeline} onOpenVariables={() => setShowVariablesModal(true)} />
      
      {/* Global Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowVariablesModal(false)}>
          <div className="w-96 bg-bg border border-border rounded-xl shadow-shadow p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-h mb-4">Global Variables</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-h">GEMINI_API_KEY</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AI API Key for Generation..." 
                  className="w-full mt-1 px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-h">DB_CONNECTION_STRING</label>
                <input type="text" placeholder="postgresql://..." className="w-full mt-1 px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
            </div>
            <button 
              onClick={() => {
                localStorage.setItem('GEMINI_API_KEY', apiKey);
                setShowVariablesModal(false);
              }} 
              className="w-full mt-6 bg-accent text-white py-2 rounded-md text-sm font-medium hover-lift"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-code-bg border-b border-border z-10 relative">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-text-h !m-0 !tracking-tight">
            Local Data Architect
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            ref={pipelineFileInputRef} 
            accept=".json" 
            onChange={handleLoadPipelineFromFile} 
            className="hidden" 
          />
          
          <button 
            onClick={() => pipelineFileInputRef.current?.click()} 
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-code-bg hover:text-text transition-colors shadow-sm"
            title="Open Pipeline from JSON File"
          >
            <FolderOpen className="w-4 h-4 text-accent" /> Open Pipeline
          </button>
          
          <button 
            onClick={handleSavePipelineToFile} 
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-border rounded-md hover:bg-code-bg hover:text-text transition-colors shadow-sm mr-2"
            title="Save Pipeline to JSON File"
          >
            <Save className="w-4 h-4 text-accent" /> Save Pipeline
          </button>

          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="p-2 border border-border rounded-md hover-lift bg-code-bg text-text transition-colors"
            title="Toggle Theme"
          >
            {mounted && theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="text-xs text-text-muted font-mono hidden md:block border border-border px-2 py-1 rounded mr-2">
            Ctrl+K for Commands
          </span>
          <div className="flex items-center bg-code-bg rounded-md border border-border overflow-hidden mr-2">
            <div className="h-6 w-px bg-border mx-1" />
            <button onClick={groupNodes} className="p-2 hover:bg-code-bg rounded text-text-muted hover:text-text transition-colors flex items-center gap-2 text-xs" title="Group Selected Nodes">
              <Folders className="w-4 h-4" /> Group
            </button>
            <div className="h-6 w-px bg-border mx-1" />
            <button onClick={alignLeft} className="p-2 hover:bg-accent-bg text-text hover:text-accent border-r border-border transition-colors" title="Align Left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="22" x2="4" y2="2"></line><rect x="8" y="6" width="12" height="4" rx="1"></rect><rect x="8" y="14" width="8" height="4" rx="1"></rect></svg>
            </button>
            <button onClick={alignTop} className="p-2 hover:bg-accent-bg text-text hover:text-accent border-r border-border transition-colors" title="Align Top">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="4" x2="22" y2="4"></line><rect x="6" y="8" width="4" height="12" rx="1"></rect><rect x="14" y="8" width="4" height="8" rx="1"></rect></svg>
            </button>
            <button onClick={distributeHorizontally} className="p-2 hover:bg-accent-bg text-text hover:text-accent transition-colors" title="Distribute Horizontally">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="4" height="12" rx="1"></rect><rect x="16" y="6" width="4" height="12" rx="1"></rect><line x1="12" y1="6" x2="12" y2="18"></line></svg>
            </button>
          </div>
          <button 
            onClick={autoLayout} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-code-bg hover:text-text transition-colors shadow-sm mr-4"
          >
            Auto Layout
          </button>

          <button onClick={handleRunPipeline} disabled={isRunning} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-glow transition-all ${isRunning ? 'bg-accent/50 text-white/50' : 'bg-accent text-white hover-bg-lift'}`}>
            {isRunning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Executing...' : 'Run Pipeline'}
          </button>
          
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 border border-border rounded-lg bg-bg hover:bg-code-bg text-text transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Node Library */}
        <aside className="w-64 border-r border-border bg-code-bg flex flex-col overflow-hidden z-10 relative">
          <div className="p-3 border-b border-border">
            <h2 className="text-xs font-bold text-text uppercase tracking-wider !m-0 mb-2">
              Node Library
            </h2>
            <input 
              type="text" 
              placeholder="Search nodes..." 
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full px-2 py-1 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {/* Documentation Category */}
            <div className="mb-2">
              <div className="flex gap-2">
                <button onClick={saveMacro} className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg text-xs font-medium text-text transition-colors flex items-center justify-between">
                  💾 Save as Macro
                </button>
                <div 
                  onDragStart={(e) => onDragStart(e, 'stickyNote', 'stickyNote')} 
                  draggable 
                  className="p-2 border border-yellow-500/40 rounded-md bg-yellow-500/10 hover:border-yellow-500 cursor-grab text-xs font-medium text-yellow-600 dark:text-yellow-400 transition-colors flex items-center justify-between"
                >
                  📝 Add Sticky Note
                </div>
              </div>
            </div>
            
            {favorites.length > 0 && (
              <div className="mb-2">
                <button onClick={() => toggleCategory('Favorites')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                  <div className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Favorites</div>
                  {expandedCategories['Favorites'] !== false ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedCategories['Favorites'] !== false && (
                  <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                    {favorites.map(fav => (
                      <div key={`fav-${fav}`} onDragStart={(e) => onDragStart(e, ['csvInput', 'postgresInput', 'jsonInput', 'parquetInput', 'excelInput', 'restApiInput', 'graphQLInput', 'xmlInput', 'avroInput', 'orcInput', 'featherInput', 'fixedWidthInput', 'sqliteInput', 'duckdbInput'].includes(fav) ? 'dataSource' : 'transform', fav)} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">
                        {labelMap[fav] || fav}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {macros.length > 0 && (
              <div className="mb-2">
                <button onClick={() => toggleCategory('Macros')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">📦 Saved Macros</div>
                  {expandedCategories['Macros'] !== false ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedCategories['Macros'] !== false && (
                  <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                    {macros.map(macro => (
                      <div key={macro.id} onDragStart={(e) => onDragStart(e, 'macro', macro.id)} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">
                        {macro.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Input Category */}
            <div className="mb-2">
              <button onClick={() => toggleCategory('Input')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                <div className="flex items-center gap-2"><FileInput className="w-4 h-4 text-accent" /> Input</div>
                {expandedCategories['Input'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories['Input'] && (
                <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'csvInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">CSV Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'jsonInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">JSON Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'parquetInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Parquet Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'excelInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Excel Input</div>

                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'postgresInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">PostgreSQL (Mock)</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'restApiInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">REST API</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'graphQLInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">GraphQL</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'xmlInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">XML Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'avroInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Avro Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'orcInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">ORC Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'featherInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Feather Input</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'fixedWidthInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Fixed Width</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'sqliteInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">SQLite DB</div>
                  <div onDragStart={(e) => onDragStart(e, 'dataSource', 'duckdbInput')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">DuckDB File</div>
                </div>
              )}
            </div>

            {/* Cleaning Category */}
            <div className="mb-2">
              <button onClick={() => toggleCategory('Cleaning')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-orange-400" /> Cleaning</div>
                {expandedCategories['Cleaning'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories['Cleaning'] && (
                <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'removeNulls')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Remove Nulls</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'removeDuplicates')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Remove Duplicates</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'fillMissing')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Fill Missing</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'typeConversion')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Type Cast</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'trimWhitespace')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Trim Whitespace</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'textCasing')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Text Casing</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'replaceText')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Replace Text</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'regexExtract')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Regex Extract</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'dropColumns')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Drop Columns</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'renameColumn')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Rename Column</div>
                </div>
              )}
            </div>

            {/* Transformation Category */}
            <div className="mb-2">
              <button onClick={() => toggleCategory('Transformation')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                <div className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-green-400" /> Transformation</div>
                {expandedCategories['Transformation'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories['Transformation'] && (
                <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'filterRows')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Filter Rows</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'sortRows')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Sort Rows</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'topN')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Top N</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'sampleRows')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Sample Rows</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'dateTruncate')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Date Truncate</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'dateArithmetic')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Date Arithmetic</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'conditionalLogic')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">If/Then Logic</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'splitPart')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Split Part</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'stringLength')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">String Length</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'mathFormula')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Math Formula</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'extractYear')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Extract Year</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'innerJoin')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Inner Join</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'leftJoin')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Left Join</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'unionAll')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Union All</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'customSql')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Custom SQL</div>
                </div>
              )}
            </div>

            {/* Aggregation Category */}
            <div className="mb-2">
              <button onClick={() => toggleCategory('Aggregation')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-purple-400" /> Aggregation</div>
                {expandedCategories['Aggregation'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories['Aggregation'] && (
                <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'groupBy')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Group By</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'windowFunction')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Window Function</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'pivotTable')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Pivot Table</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'unpivotTable')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Unpivot/Melt</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'rollup')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Rollup</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'summaryStats')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Summary Stats</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'medianAgg')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Median</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'modeAgg')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Mode</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'stdDevAgg')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Std Dev</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'varianceAgg')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Variance</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'correlationMatrix')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Correlation Matrix</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'movingAverage')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Moving Average</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'runningTotal')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Running Total</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'normalizeColumn')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Normalize</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'standardizeColumn')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Standardize</div>
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'regexMatch')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Regex Match</div>
                </div>
              )}
            </div>

            {/* Export Category */}
            <div className="mb-2">
              <button onClick={() => toggleCategory('Export')} className="flex items-center justify-between w-full p-2 text-sm font-medium text-text-h hover:bg-code-bg rounded-md transition-colors cursor-pointer">
                <div className="flex items-center gap-2"><FolderOutput className="w-4 h-4 text-gray-400" /> Export</div>
                {expandedCategories['Export'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories['Export'] && (
                <div className="flex flex-col gap-1 pl-4 pr-2 mt-1">
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'exportCsv')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">Export to CSV</div>
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* Welcome Modal */}
        {isWelcomeModalOpen && (
          <WelcomeModal 
             onNew={() => { setNodes([]); setEdges([]); setIsWelcomeModalOpen(false); }} 
             onOpenRecent={handleOpenRecent}
             onOpenFile={() => pipelineFileInputRef.current?.click()}
             onLoadTemplate={handleLoadTemplate} 
          />
        )}
        
        {isSettingsModalOpen && (
          <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
        )}

        {/* Main Canvas Area */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
            colorMode={mounted && (resolvedTheme ?? theme) === 'dark' ? 'dark' : 'light'} 
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            deleteKeyCode={['Delete', 'Backspace']}
            connectionRadius={40}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border)" />
            <Controls className="bg-bg border-border fill-text-h shadow-shadow" />
            <MiniMap 
              nodeColor="var(--accent)" 
              maskColor="var(--social-bg)" 
              className="bg-bg border border-border rounded-lg shadow-shadow" 
            />
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="text-4xl mb-4 opacity-20">🪄</div>
                <h3 className="text-xl font-bold text-text-muted opacity-50">Canvas is empty</h3>
                <p className="text-sm text-text-muted opacity-40 mt-2">Drag a node from the sidebar or press Cmd+K to start building.</p>
              </div>
            )}
          </ReactFlow>
        </main>

        {/* Resizer for Properties Panel */}
        {selectedNode && (
          <div 
            className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors"
            onMouseDown={() => setIsResizingPanel(true)}
          />
        )}

        {/* Right Sidebar - Properties Panel */}
        {selectedNode && (
          <div style={{ width: panelWidth }} className="flex-shrink-0">
            <PropertiesPanel 
              selectedNode={selectedNode}
              onUpdateNode={updateNodeData}
              nodes={nodes}
              edges={edges}
            />
          </div>
        )}
      </div>
      {/* Resizer for Console Panel */}
      <div 
        className="h-1 bg-border hover:bg-accent cursor-row-resize transition-colors w-full"
        onMouseDown={() => setIsResizingConsole(true)}
      />
      {/* Bottom Console Shell */}
      <footer style={{ height: consoleHeight }} className="border-t border-border bg-bg p-0 flex flex-col z-10 shadow-shadow">
        <div className="flex border-b border-border bg-code-bg px-4 pt-2">
          <button 
            onClick={() => setActiveConsoleTab('output')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeConsoleTab === 'output' ? 'text-accent bg-code-bg border-b-2 border-b-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Output Preview
          </button>
          <button 
            onClick={() => { setActiveConsoleTab('input'); fetchInputPreview(); }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeConsoleTab === 'input' ? 'text-accent bg-code-bg border-b-2 border-b-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Input Preview
          </button>
          <button 
            onClick={() => setActiveConsoleTab('sql')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeConsoleTab === 'sql' ? 'text-accent bg-code-bg border-b-2 border-b-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            SQL Output
          </button>
          <button 
            onClick={() => setActiveConsoleTab('dashboard')} 
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeConsoleTab === 'dashboard' ? 'text-accent bg-code-bg border-b-2 border-b-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveConsoleTab('logs')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeConsoleTab === 'logs' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Execution Logs
          </button>
          <button 
            onClick={() => setActiveConsoleTab('explain' as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeConsoleTab === ('explain' as any) ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Explain Plan
          </button>
          <button 
            onClick={() => setActiveConsoleTab('history' as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeConsoleTab === ('history' as any) ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            History
          </button>
          <button 
            onClick={() => setActiveConsoleTab('audit' as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeConsoleTab === ('audit' as any) ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Audit Logs
          </button>
        </div>
        
        {/* FIXED: Dynamic Content Area */}
        <div className="flex-1 overflow-auto bg-bg">
          {activeConsoleTab === 'sql' && (
            <Editor
              height="100%"
              defaultLanguage="sql"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={sqlOutput} 
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }}
            />
          )}

          {activeConsoleTab === 'dashboard' && (
             <Dashboard data={previewData} columns={pipelineMetadata?.columns || []} />
          )}
          
          {activeConsoleTab === 'output' && (
             <div className="p-4 h-full flex flex-col gap-2">
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
                        </select>
                        <a href={downloadUrl} className="px-3 py-1 bg-accent text-white rounded-md text-xs font-medium hover-lift transition-colors flex items-center gap-2">
                          <FolderOutput className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 overflow-auto">
                  {previewData.length > 0 ? (
                    <table className="w-full text-left text-sm text-text border-collapse">
                      <thead className="text-text-h border-b border-border bg-bg sticky top-0">
                        <tr>
                          {Object.keys(previewData[0]).map((key) => (
                            <th key={key} className="p-2 whitespace-nowrap">
                              {key}
                              {pipelineMetadata?.columns && (
                                <span className="ml-2 text-xs text-text-muted font-normal lowercase">
                                  {pipelineMetadata.columns.find((c: any) => c.name === key)?.type}
                                </span>
                              )}
                            </th>
                          ))}
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
                  {inputPreviewData.length > 0 ? (
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

          {activeConsoleTab === ('explain' as any) && (
             <div className="p-4 h-full bg-bg overflow-auto">
               <pre className="text-sm font-mono text-text p-4 bg-bg rounded-md border border-border">{explainPlan || 'Run pipeline to see execution plan.'}</pre>
             </div>
          )}

          {activeConsoleTab === ('history' as any) && (
             <HistoryViewer />
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
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 flex items-center gap-2 transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'warning' ? 'bg-orange-500 text-white' :
          'bg-accent text-white'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
