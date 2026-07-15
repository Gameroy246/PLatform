import { useState } from 'react';
import type { DragEvent } from 'react'; // FIXED: Strict type import
import axios from 'axios';
import { ReactFlow, MiniMap, Controls, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Database, ChevronDown, ChevronRight, FileInput, Filter, Calculator, ArrowRightLeft, FolderOutput, Sun, Moon } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useStore } from './store';
import DataSourceNode from './components/DataSourceNode';
import TransformNode from './components/TransformNode';
import PropertiesPanel from './components/PropertiesPanel';
import CommandPalette from './components/CommandPalette';
import Dashboard from './components/Dashboard';
import { useEffect } from 'react';

const nodeTypes = {
  dataSource: DataSourceNode,
  transform: TransformNode,
};

export default function App() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onSelectionChange, addNode, updateNodeData, undo, redo, deleteSelected, duplicateSelected, setNodeStatuses } = useStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'sql' | 'logs' | 'dashboard'>('sql');
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('THEME');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('THEME', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
  
  // State variables for DuckDB execution results
  const [sqlOutput, setSqlOutput] = useState("");
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [pipelineMetadata, setPipelineMetadata] = useState<any>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, duplicateSelected, deleteSelected]);

  // --- DRAG AND DROP HANDLERS ---
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

    const position = {
      x: event.clientX - 260, 
      y: event.clientY - 80,  
    };

    addNodeFromPalette(type, operation || type, position);
  };

  const addNodeFromPalette = (type: string, operation: string, position = { x: 100, y: 100 }) => {
    const labelMap: Record<string, string> = {
      csvInput: 'CSV Input',
      jsonInput: 'JSON Input',
      parquetInput: 'Parquet Input',
      excelInput: 'Excel Input',
      postgresInput: 'PostgreSQL Input',
      
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
      unionAll: 'Union All',
      
      groupBy: 'Group By',
      windowFunction: 'Window Func',
      pivotTable: 'Pivot Table',
      unpivotTable: 'Unpivot/Melt',
      rollup: 'Rollup',
      summaryStats: 'Summary Stats',
      
      mathFormula: 'Math Formula',
      extractYear: 'Extract Year',
      customSql: 'Custom SQL',
      aiTransform: 'AI Transform',
      exportCsv: 'Export CSV',
    };
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

  // --- PIPELINE EXECUTION ---
  const handleRunPipeline = async () => {
    try {
      const mappedNodes = nodes.map(node => {
        let generatedSql = node.data.sql as string || "";
        const op = node.data.operation;
        const parentEdges = edges.filter(e => e.target === node.id);
        const parents = parentEdges.map(e => `node_${e.source.replace(/-/g, '_')}`);
        const parent1 = parents[0] || 'DUAL';
        const parent2 = parents[1] || 'DUAL';

        switch (op) {
          case 'csvInput': 
            const csvFile = String(node.data.file || '');
            if (csvFile.toLowerCase().endsWith('.xlsx') || csvFile.toLowerCase().endsWith('.xls')) {
              generatedSql = `__EXCEL__ '${csvFile}'`;
            } else {
              generatedSql = `SELECT * FROM read_csv_auto('${csvFile}')`;
            }
            break;
          case 'jsonInput': generatedSql = `SELECT * FROM read_json_auto('${node.data.file || ''}')`; break;
          case 'parquetInput': generatedSql = `SELECT * FROM read_parquet('${node.data.file || ''}')`; break;
          case 'excelInput': generatedSql = `__EXCEL__ '${node.data.file || ''}'`; break;
          case 'postgresInput': generatedSql = `SELECT * FROM postgres_scan('${node.data.connection_string || ''}', '${node.data.table || ''}')`; break;
          
          case 'removeDuplicates': generatedSql = `SELECT DISTINCT * FROM ${parent1}`; break;
          case 'removeNulls': generatedSql = `SELECT * FROM ${parent1} WHERE ${node.data.column || 'id'} IS NOT NULL`; break;
          case 'fillMissing': generatedSql = `SELECT *, COALESCE(${node.data.column || 'id'}, '${node.data.defaultVal || '0'}') AS ${node.data.newCol || 'filled_val'} FROM ${parent1}`; break;
          case 'typeConversion': generatedSql = `SELECT *, CAST(${node.data.column || 'id'} AS ${node.data.targetType || 'INTEGER'}) AS ${node.data.newCol || 'cast_val'} FROM ${parent1}`; break;
          case 'trimWhitespace': generatedSql = `SELECT *, TRIM(${node.data.column || 'id'}) AS ${node.data.newCol || 'trimmed'} FROM ${parent1}`; break;
          case 'textCasing': generatedSql = `SELECT *, ${node.data.casing || 'UPPER'}(${node.data.column || 'id'}) AS ${node.data.newCol || 'cased_val'} FROM ${parent1}`; break;
          case 'replaceText': generatedSql = `SELECT *, REPLACE(${node.data.column || 'id'}, '${node.data.oldText || ''}', '${node.data.newText || ''}') AS ${node.data.newCol || 'replaced'} FROM ${parent1}`; break;
          case 'regexExtract': generatedSql = `SELECT *, REGEXP_EXTRACT(${node.data.column || 'id'}, '${node.data.pattern || '.*'}') AS ${node.data.newCol || 'regex_val'} FROM ${parent1}`; break;
          case 'dropColumns': generatedSql = `SELECT * EXCLUDE (${node.data.columns || 'id'}) FROM ${parent1}`; break;
          case 'renameColumn': generatedSql = `SELECT * RENAME (${node.data.oldCol || 'old'} AS ${node.data.newCol || 'new'}) FROM ${parent1}`; break;
          
          case 'filterRows': generatedSql = `SELECT * FROM ${parent1} WHERE ${node.data.condition || '1=1'}`; break;
          case 'sortRows': generatedSql = `SELECT * FROM ${parent1} ORDER BY ${node.data.column || 'id'} ${node.data.direction || 'ASC'}`; break;
          case 'topN': generatedSql = `SELECT * FROM ${parent1} LIMIT ${node.data.limit || '10'}`; break;
          case 'sampleRows': generatedSql = `SELECT * FROM ${parent1} USING SAMPLE ${node.data.percent || '10'}%`; break;
          case 'dateTruncate': generatedSql = `SELECT *, DATE_TRUNC('${node.data.part || 'month'}', CAST(${node.data.column || 'date_col'} AS TIMESTAMP)) AS ${node.data.newCol || 'trunc_date'} FROM ${parent1}`; break;
          case 'dateArithmetic': generatedSql = `SELECT *, CAST(${node.data.column || 'date_col'} AS TIMESTAMP) + INTERVAL ${node.data.amount || '1'} ${node.data.interval || 'DAY'} AS ${node.data.newCol || 'new_date'} FROM ${parent1}`; break;
          case 'conditionalLogic': generatedSql = `SELECT *, CASE WHEN ${node.data.condition || '1=1'} THEN '${node.data.trueVal || 'Yes'}' ELSE '${node.data.falseVal || 'No'}' END AS ${node.data.newCol || 'case_val'} FROM ${parent1}`; break;
          case 'splitPart': generatedSql = `SELECT *, str_split(${node.data.column || 'id'}, '${node.data.delim || ','}')[${node.data.index || '1'}] AS ${node.data.newCol || 'split_val'} FROM ${parent1}`; break;
          case 'stringLength': generatedSql = `SELECT *, LENGTH(${node.data.column || 'id'}) AS ${node.data.newCol || 'len'} FROM ${parent1}`; break;
          
          case 'mathFormula': generatedSql = `SELECT *, (${node.data.formula || '1'}) AS ${node.data.newCol || 'calc_val'} FROM ${parent1}`; break;
          case 'extractYear': generatedSql = `SELECT *, EXTRACT(YEAR FROM CAST(${node.data.column || 'date_col'} AS TIMESTAMP)) AS ${node.data.newCol || 'year_val'} FROM ${parent1}`; break;
          
          case 'innerJoin': generatedSql = `SELECT * FROM ${parent1} INNER JOIN ${parent2} ON ${node.data.joinCondition || '1=0'}`; break;
          case 'leftJoin': generatedSql = `SELECT * FROM ${parent1} LEFT JOIN ${parent2} ON ${node.data.joinCondition || '1=0'}`; break;
          case 'unionAll': generatedSql = `SELECT * FROM ${parent1} UNION ALL SELECT * FROM ${parent2}`; break;
          
          case 'groupBy': 
            const agg = node.data.aggFunc || 'COUNT';
            if (agg === 'COUNT DISTINCT') {
              generatedSql = `SELECT ${node.data.groupCol || 'id'}, COUNT(DISTINCT ${node.data.aggCol || '*'}) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`;
            } else if (agg === 'STRING_AGG') {
              generatedSql = `SELECT ${node.data.groupCol || 'id'}, STRING_AGG(${node.data.aggCol || '*'}, ', ') AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`;
            } else {
              generatedSql = `SELECT ${node.data.groupCol || 'id'}, ${agg}(${node.data.aggCol || '*'}) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`;
            }
            break;
          case 'windowFunction': generatedSql = `SELECT *, ${node.data.func || 'SUM'}(${node.data.valCol || 'amount'}) OVER (PARTITION BY ${node.data.partCol || 'category'} ORDER BY ${node.data.orderCol || 'date'}) AS ${node.data.newCol || 'window_result'} FROM ${parent1}`; break;
          case 'pivotTable': generatedSql = `PIVOT ${parent1} ON ${node.data.pivotCol || 'category'} USING ${node.data.aggFunc || 'SUM'}(${node.data.valCol || 'amount'}) GROUP BY ${node.data.groupCol || 'id'}`; break;
          case 'unpivotTable': generatedSql = `UNPIVOT ${parent1} ON COLUMNS(* EXCLUDE(${node.data.idCol || 'id'})) INTO NAME ${node.data.nameCol || 'variable'} VALUE ${node.data.valCol || 'value'}`; break;
          case 'rollup': generatedSql = `SELECT ${node.data.groupCols || 'category, subcategory'}, ${node.data.aggFunc || 'SUM'}(${node.data.valCol || 'amount'}) AS agg_val FROM ${parent1} GROUP BY ROLLUP(${node.data.groupCols || 'category, subcategory'})`; break;
          case 'summaryStats': generatedSql = `SUMMARIZE SELECT * FROM ${parent1}`; break;
          
          case 'exportCsv': generatedSql = `SELECT * FROM ${parent1}`; break;
          case 'customSql': 
            generatedSql = (node.data.sql as string) || `SELECT * FROM ${parent1}`; 
            if (generatedSql.includes('{parent}')) generatedSql = generatedSql.replace(/{parent}/g, parent1);
            if (generatedSql.includes('{parent1}')) generatedSql = generatedSql.replace(/{parent1}/g, parent1);
            if (generatedSql.includes('{parent2}')) generatedSql = generatedSql.replace(/{parent2}/g, parent2);
            break;
          case 'aiTransform': 
            generatedSql = (node.data.sql as string) || `SELECT * FROM ${parent1}`; 
            if (generatedSql.includes('{parent}')) generatedSql = generatedSql.replace(/{parent}/g, parent1);
            break;
          default:
            if (!generatedSql) {
              generatedSql = parents.length ? `SELECT * FROM ${parent1}` : `SELECT 'Disconnected' AS status`;
            }
        }
        return { id: node.id, sql: generatedSql };
      });

      const mappedEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target
      }));

      const payload = { nodes: mappedNodes, edges: mappedEdges };
      const response = await axios.post('http://localhost:8000/api/execute', payload);
      
      const { data } = response;
      setSqlOutput(data.final_sql);
      setExecutionLogs(data.logs);
      setPreviewData(data.sample_result);
      setPipelineMetadata(data.metadata);
      if (data.node_statuses) {
        setNodeStatuses(data.node_statuses);
      }
      setActiveTab('preview'); 
      
      // Prompt for full result download
      setTimeout(() => {
        if (window.confirm("Pipeline executed successfully! Do you want to download the full result as a CSV?")) {
          const match = data.final_sql.match(/FROM (node_[a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            window.location.href = `http://localhost:8000/api/download/${match[1]}`;
          }
        }
      }, 100);

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || error.message;
      setExecutionLogs([`[CRITICAL] Execution Failed: ${msg}`]);
      
      // Attempt to extract node statuses even on failure if backend sent it
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
      <header className="flex items-center justify-between px-6 py-4 glass-header shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-bold text-text-h !m-0 !tracking-normal">
            Local Data Architect
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 border border-border rounded-md hover-lift bg-code-bg text-text transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="text-xs text-text-muted font-mono hidden md:block border border-border px-2 py-1 rounded">
            Ctrl+K for Commands
          </span>
          <button 
            onClick={handleRunPipeline} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover-lift shadow-shadow cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> Run Pipeline
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Node Library */}
        <aside className="w-64 border-r border-border glass-panel flex flex-col overflow-hidden z-10 shadow-shadow relative">
          <div className="p-4 border-b border-border">
            <h2 className="text-xs font-bold text-text uppercase tracking-wider !m-0">
              Node Library
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            
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
                  <div onDragStart={(e) => onDragStart(e, 'transform', 'aiTransform')} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">AI Transform</div>
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

        {/* Canvas Area */}
        <main className="flex-1 relative bg-code-bg">
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
            colorMode="system" 
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            deleteKeyCode={null} // We handle it globally
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border)" />
            <Controls className="bg-bg border-border fill-text-h shadow-shadow" />
            <MiniMap 
              nodeColor="var(--accent)" 
              maskColor="var(--social-bg)" 
              className="bg-bg border border-border rounded-lg shadow-shadow" 
            />
          </ReactFlow>
        </main>

        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel 
          selectedNode={selectedNode}
          onUpdateNode={updateNodeData}
        />
      </div>

      {/* Bottom Console Shell */}
      <footer className="h-64 border-t border-border bg-bg p-0 flex flex-col z-10 shadow-shadow">
        <div className="flex border-b border-border bg-code-bg px-4 pt-2">
          <button 
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border ${activeTab === 'sql' ? 'text-accent bg-code-bg border-b-2 border-b-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            SQL Output
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-accent bg-code-bg border-b-2 border-b-accent' : 'text-text-muted hover:text-text hover:bg-code-bg/50'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'preview' ? 'text-accent border-b-2 border-accent' : 'text-text hover:text-text-h'}`}
          >
            Data Preview
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'logs' ? 'text-accent border-b-2 border-accent' : 'text-text hover:text-text-h'}`}
          >
            Execution Logs
          </button>
        </div>
        
        {/* FIXED: Dynamic Content Area */}
        <div className="flex-1 overflow-auto bg-[#1e1e1e]">
          {activeTab === 'sql' && (
            <Editor
              height="100%"
              defaultLanguage="sql"
              theme={isDarkMode ? 'vs-dark' : 'light'}
              value={sqlOutput} 
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }}
            />
          )}

          {activeTab === 'dashboard' && (
             <Dashboard data={previewData} columns={pipelineMetadata?.columns || []} />
          )}
          
          {activeTab === 'preview' && (
             <div className="p-4 h-full flex flex-col gap-2">
                {pipelineMetadata && (
                  <div className="flex gap-4 p-2 bg-bg border border-border rounded-md text-xs font-mono text-text mb-2">
                    <span className="text-accent font-bold">PROFILING</span>
                    <span>Rows: {pipelineMetadata.row_count}</span>
                    <span>Columns: {pipelineMetadata.column_count}</span>
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
                          <tr key={i} className="border-b border-border border-opacity-50 hover:bg-code-bg">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2 whitespace-nowrap">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="font-mono text-sm text-text-h bg-code-bg p-2 rounded-md">
                      <p><span className="text-accent">~/local-data-architect</span> $ Waiting for execution DAG...</p>
                    </div>
                  )}
                </div>
             </div>
          )}

          {activeTab === 'logs' && (
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
    </div>
  );
}