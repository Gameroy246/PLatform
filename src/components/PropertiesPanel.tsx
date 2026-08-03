"use client";
import { useState, useRef, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import axios from 'axios';
import { FolderOpen, Settings2, Trash2, ArrowRight, ArrowDownRight, Star } from 'lucide-react';
import DataPreviewModal from './DataPreviewModal';
import { generateNodeSQL } from '../lib/sqlGenerator';
import { useStore } from '../store';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: any) => void;
  onAIGenerate?: (id: string, prompt: string) => Promise<void>;
  nodes?: Node[];
  edges?: Edge[];
}

export default function PropertiesPanel({ selectedNode, onUpdateNode, onAIGenerate, nodes = [], edges = [] }: PropertiesPanelProps) {
  const { favorites, addFavorite, removeFavorite } = useStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'description' | 'metadata'>('settings');
  const [previewStreamMode, setPreviewStreamMode] = useState<'success' | 'error'>('success');
  const [isBrowsing, setIsBrowsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  const [realtimeSchema, setRealtimeSchema] = useState<{name: string, type: string}[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode || !['transform', 'join'].includes(selectedNode.type || '') && !['dataSource'].includes(selectedNode.type || '')) {
      setRealtimeSchema([]);
      return;
    }
    
    // For Data Source nodes, we check if they already have columns attached from upload
    if (selectedNode.type === 'dataSource') {
       if (selectedNode.data.columns) {
         setRealtimeSchema((selectedNode.data.columns as string[]).map(c => ({name: c, type: 'UNKNOWN'})));
       } else {
         setRealtimeSchema([]);
       }
       return;
    }

    let isMounted = true;
    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        const mappedNodes = nodes.map(n => ({ ...n, sql: generateNodeSQL(n, edges) }));
        const payload = { nodes: mappedNodes, edges, targetNodeId: selectedNode.id };
        const res = await axios.post('/api/schema', payload);
        if (isMounted && res.data.schema) {
          setRealtimeSchema(res.data.schema);
        }
      } catch (err) {
        console.error("Failed to fetch mid-pipeline schema", err);
      } finally {
        if (isMounted) setSchemaLoading(false);
      }
    };

    const timer = setTimeout(fetchSchema, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedNode?.id, nodes, edges]);

  
  const ColumnSelect = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) => (
    <select 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
    >
      <option value="" disabled>{placeholder || 'Select a column...'}</option>
      {realtimeSchema.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
    </select>
  );

  const ValueSelect = ({ column, value, onChange, placeholder }: { column: string, value: string, onChange: (val: string) => void, placeholder?: string }) => {
    const [values, setValues] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
      if (!column || !selectedNode) {
        setValues([]);
        return;
      }
      let isMounted = true;
      const fetchValues = async () => {
        setLoading(true);
        try {
          const mappedNodes = nodes.map(n => ({ ...n, sql: generateNodeSQL(n, edges) }));
          const payload = { nodes: mappedNodes, edges, targetNodeId: selectedNode.id, columnName: column };
          const res = await axios.post('/api/values', payload);
          if (isMounted && res.data.values) {
            setValues(res.data.values);
          }
        } catch (err) {
          console.error("Failed to fetch values", err);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      
      const timer = setTimeout(fetchValues, 500);
      return () => { isMounted = false; clearTimeout(timer); };
    }, [column, selectedNode?.id, nodes, edges]);
    
    return (
      <select 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
      >
        <option value="" disabled>{loading ? 'Loading...' : (placeholder || 'Select a value...')}</option>
        {values.map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
      </select>
    );
  };

  const handlePreviewNode = async () => {
    try {
      setPreviewLoading(true);
      setPreviewError('');
      const payload = { nodes, edges, targetNodeId: selectedNode!.id, previewStream: previewStreamMode };
      const res = await axios.post('/api/preview', payload);
      setPreviewData(res.data.preview);
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProfileNode = async () => {
    try {
      setProfileLoading(true);
      const res = await axios.post('/api/profile', { nodes, edges, targetNodeId: selectedNode!.id });
      setProfileData(res.data.profile);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBrowseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsBrowsing(true);
      
      const newPaths: string[] = [];
      let lastHeaders: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        const response = await axios.post('/api/upload', formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (response.data.path) {
          newPaths.push(response.data.path);
        }
        if (response.data.headers) {
          lastHeaders = response.data.headers;
        }
      }

      let currentFiles: string[] = [];
      try {
        if (selectedNode!.data.file) {
           const parsed = JSON.parse(selectedNode!.data.file as string);
           if (Array.isArray(parsed)) currentFiles = parsed;
           else currentFiles = [selectedNode!.data.file as string];
        }
      } catch (e) {
        currentFiles = selectedNode!.data.file ? [selectedNode!.data.file as string] : [];
      }

      const updatedFiles = [...currentFiles, ...newPaths];
      onUpdateNode(selectedNode!.id, { file: JSON.stringify(updatedFiles), columns: lastHeaders });

    } catch (error) {
      console.error("Failed to upload file", error);
    } finally {
      setIsBrowsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!selectedNode) {
    return (
      <aside className="h-full border-l border-border bg-code-bg p-4 z-10 hidden lg:block relative">
        <h2 className="text-xs font-bold text-text uppercase tracking-wider !m-0 mb-2">
          Properties
        </h2>
        <div className="p-4 border border-dashed border-border bg-code-bg rounded-lg text-center text-sm mt-4">
          Select a node to view settings
        </div>
      </aside>
    );
  }
  let fileAccept = "*/*";
  if (selectedNode.data.operation === 'csvInput') fileAccept = ".csv";
  else if (selectedNode.data.operation === 'excelInput') fileAccept = ".xlsx, .xls";
  else if (selectedNode.data.operation === 'jsonInput') fileAccept = ".json";
  else if (selectedNode.data.operation === 'parquetInput') fileAccept = ".parquet";


  return (
    <>
    <aside className="h-full border-l border-border bg-code-bg flex flex-col z-10 hidden lg:flex relative">
      <div className="p-4 border-b border-border">
        <h2 className="text-xs font-bold text-text uppercase tracking-wider !m-0">
          Properties
        </h2>
      </div>

      <div className="flex border-b border-border bg-code-bg">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'settings' ? 'text-accent border-b-2 border-accent' : 'text-text hover:text-text-h'}`}
        >
          Settings
        </button>
        <button 
          onClick={() => setActiveTab('description')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'description' ? 'text-accent border-b-2 border-accent' : 'text-text hover:text-text-h'}`}
        >
          Desc
        </button>
        <button 
          onClick={() => setActiveTab('metadata')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'metadata' ? 'text-accent border-b-2 border-accent' : 'text-text hover:text-text-h'}`}
        >
          Meta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {activeTab === 'settings' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-h">Node ID</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text font-mono text-[10px] overflow-hidden text-ellipsis">
                  {selectedNode.id}
                </div>
                <button 
                  onClick={() => favorites.includes(selectedNode.data.operation as string) ? removeFavorite(selectedNode.data.operation as string) : addFavorite(selectedNode.data.operation as string)}
                  className="p-2 border border-border rounded-md hover:bg-accent-bg transition-colors"
                  title={favorites.includes(selectedNode.data.operation as string) ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star className={`w-4 h-4 ${favorites.includes(selectedNode.data.operation as string) ? 'text-yellow-500 fill-yellow-500' : 'text-text-muted'}`} />
                </button>
              </div>
              <div className="flex gap-2 items-center w-full">
                {selectedNode.data.operation === 'dataQuality' && (
                  <select
                    value={previewStreamMode}
                    onChange={(e) => setPreviewStreamMode(e.target.value as any)}
                    className="flex-1 px-2 py-2 bg-code-bg border border-border rounded text-xs text-text focus:outline-none focus:border-accent"
                  >
                    <option value="success">Preview Valid Rows</option>
                    <option value="error">Preview Invalid Rows</option>
                  </select>
                )}
                <button 
                  onClick={handlePreviewNode} 
                  disabled={previewLoading}
                  className={`${selectedNode.data.operation === 'dataQuality' ? 'w-auto px-4' : 'w-full justify-center'} flex items-center gap-2 p-2 bg-accent text-white rounded hover-lift disabled:opacity-50`}
                  title="Preview Schema & Data for this Node"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Preview</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-h">Label</label>
              <input 
                type="text" 
                value={selectedNode.data.label as string || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
                className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-h">Node Color</label>
              <div className="flex gap-2">
                {[
                  { value: '', label: 'Default', light: 'var(--bg)', dark: 'var(--bg)' },
                  { value: '#3b1c1c', label: 'Red', light: '#fecaca', dark: '#3b1c1c' },
                  { value: '#1c2d3b', label: 'Blue', light: '#bfdbfe', dark: '#1c2d3b' },
                  { value: '#1a3a2a', label: 'Green', light: '#bbf7d0', dark: '#1a3a2a' },
                  { value: '#3b351a', label: 'Yellow', light: '#fef08a', dark: '#3b351a' },
                  { value: '#2d1c3b', label: 'Purple', light: '#e9d5ff', dark: '#2d1c3b' },
                ].map((c) => (
                  <button
                    key={c.value || 'default'}
                    onClick={() => onUpdateNode(selectedNode.id, { color: c.value || '' })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${selectedNode.data.color === c.value || (!selectedNode.data.color && !c.value) ? 'border-accent scale-110' : 'border-border hover:scale-105'}`}
                    style={{ backgroundColor: c.value || 'var(--code-bg)' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {selectedNode.data.operation === 'dataContract' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Constraint Rule (SQL WHERE syntax)</label>
                <input 
                  type="text" 
                  value={selectedNode.data.rule as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { rule: e.target.value })}
                  placeholder="e.g. amount > 0 AND status IS NOT NULL"
                  className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>
            )}

            {selectedNode.data.operation === 'autoMap' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Column Mapping (col AS new_col)</label>
                <input 
                  type="text" 
                  value={selectedNode.data.mapping as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { mapping: e.target.value })}
                  placeholder="e.g. first_name AS FirstName, dob AS DateOfBirth"
                  className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>
            )}

            {/* Breakpoint Toggle */}
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
              <label className="text-xs font-semibold text-text-h">Debugger Breakpoint</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedNode.data.isBreakpoint as boolean || false}
                  onChange={(e) => onUpdateNode(selectedNode.id, { isBreakpoint: e.target.checked })}
                  className="w-4 h-4 rounded bg-code-bg border-border text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-muted hover:text-text transition-colors">Pause execution after this node</span>
              </label>
            </div>

            {['csvInput', 'jsonInput', 'parquetInput', 'excelInput', 'avroInput', 'orcInput', 'featherInput', 'fixedWidthInput', 'xmlInput', 'arrowInput'].includes(selectedNode.data.operation as string) && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">File Path (Local or Uploaded)</label>
                  <input 
                    type="text" 
                    value={(() => {
                      try {
                        const parsed = JSON.parse(selectedNode.data.file as string || '');
                        return Array.isArray(parsed) ? parsed[0] || '' : String(selectedNode.data.file || '');
                      } catch(e) {
                        return String(selectedNode.data.file || '');
                      }
                    })()}
                    onChange={(e) => onUpdateNode(selectedNode.id, { file: e.target.value })}
                    placeholder="e.g. D:/data/uncleaned.xlsx or select file below"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors font-mono"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Uploaded Files</label>
                  <div className="flex flex-col gap-2 bg-code-bg p-2 rounded-md border border-border max-h-40 overflow-y-auto custom-scrollbar">
                    {(() => {
                      let fileList: string[] = [];
                      try {
                        const parsed = JSON.parse(selectedNode.data.file as string || '[]');
                        fileList = Array.isArray(parsed) ? parsed : (selectedNode.data.file ? [selectedNode.data.file as string] : []);
                      } catch (e) {
                        fileList = selectedNode.data.file ? [selectedNode.data.file as string] : [];
                      }
                      
                      return fileList.length > 0 ? fileList.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-xs bg-bg p-1 rounded border border-border">
                          <span className="truncate flex-1 max-w-[200px]" title={f}>{f.split(/[\\/]/).pop()}</span>
                          <button onClick={() => {
                            const newArr = [...fileList];
                            newArr.splice(i, 1);
                            onUpdateNode(selectedNode.id, { file: JSON.stringify(newArr) });
                          }} className="text-red-500 hover:bg-red-500/10 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )) : <div className="text-xs text-text-muted text-center py-2">No files uploaded.</div>;
                    })()}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <input 
                      type="file" 
                      multiple
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                      accept={fileAccept}
                    />
                    <button 
                      onClick={handleBrowseFile}
                      disabled={isBrowsing}
                      className="w-full px-3 py-2 bg-accent text-white rounded-md text-sm font-medium hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      {isBrowsing ? 'Uploading...' : 'Browse / Upload Files'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {['postgresInput', 'mysqlInput', 'sqlserverInput', 'mongodbInput'].includes(selectedNode.data.operation as string) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Connection String</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.connection_string as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { connection_string: e.target.value })}
                    placeholder="postgresql://user:pass@localhost:5432/db"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Table Name</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.table as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { table: e.target.value })}
                    placeholder="e.g. users"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </>
            )}

            {['restApiInput', 'graphQLInput'].includes(selectedNode.data.operation as string) && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">API Endpoint URL</label>
                <input 
                  type="text" 
                  value={selectedNode.data.url as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { url: e.target.value })}
                  placeholder="https://api.example.com/data"
                  className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {selectedNode.data.operation === 'sqliteInput' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">SQLite DB Path</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.db_path as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { db_path: e.target.value })}
                    placeholder="/absolute/path/to/db.sqlite"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Table Name</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.table as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { table: e.target.value })}
                    placeholder="e.g. users"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'duckdbInput' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">DuckDB File Path</label>
                <input 
                  type="text" 
                  value={selectedNode.data.file as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { file: e.target.value })}
                  placeholder="/absolute/path/to/data.duckdb"
                  className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {selectedNode.data.operation === 'removeDuplicates' && (
               <div className="p-3 bg-code-bg border border-border rounded-md text-xs text-text-muted">
                 This node automatically removes all exact duplicate rows from the incoming data. No configuration needed.
               </div>
            )}

            {selectedNode.data.operation === 'removeNulls' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Target Column (Remove if Null)</label>
                <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. email" />
              </div>
            )}

            {selectedNode.data.operation === 'fillMissing' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. age" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Default Value (String or Number)</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.defaultVal as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { defaultVal: e.target.value })}
                    placeholder="e.g. 0 or 'Unknown'"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'typeConversion' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.column as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })}
                    placeholder="e.g. amount"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Target Type</label>
                  <select 
                    value={selectedNode.data.targetType as string || 'INTEGER'}
                    onChange={(e) => onUpdateNode(selectedNode.id, { targetType: e.target.value })}
                    className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="INTEGER">Integer</option>
                    <option value="DOUBLE">Double / Float</option>
                    <option value="VARCHAR">String / Text</option>
                    <option value="BOOLEAN">Boolean</option>
                    <option value="TIMESTAMP">Timestamp</option>
                  </select>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'trimWhitespace' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Target Column</label>
                <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. name" />
              </div>
            )}

            {selectedNode.data.operation === 'textCasing' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. status" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Casing</label>
                  <select value={selectedNode.data.casing as string || 'UPPER'} onChange={(e) => onUpdateNode(selectedNode.id, { casing: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors">
                    <option value="UPPER">UPPERCASE</option>
                    <option value="LOWER">lowercase</option>
                  </select>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'replaceText' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. description" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Old Text (Existing)</label>
                    <ValueSelect column={selectedNode.data.column as string} value={selectedNode.data.oldText as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { oldText: val })} placeholder="Select value..." />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">New Text</label>
                    <input type="text" value={selectedNode.data.newText as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { newText: e.target.value })} placeholder="e.g. Bar" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'regexExtract' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. email" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Regex Pattern</label>
                  <input type="text" value={selectedNode.data.pattern as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { pattern: e.target.value })} placeholder="e.g. @(.*)" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'dropColumns' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Columns to Drop (Comma Separated)</label>
                <input type="text" value={selectedNode.data.columns as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { columns: e.target.value })} placeholder="e.g. id, created_at" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
            )}

            {selectedNode.data.operation === 'renameColumn' && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold text-text-h">Old Name</label>
                  <ColumnSelect value={selectedNode.data.oldCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { oldCol: val })} placeholder="e.g. user_id" />
                </div>
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold text-text-h">New Name</label>
                  <input type="text" value={selectedNode.data.newCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { newCol: e.target.value })} placeholder="e.g. id" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
              </div>
            )}


            {selectedNode.data.operation === 'filterRows' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Filter Condition</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ColumnSelect value={selectedNode.data.filterCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { filterCol: val })} placeholder="Column" />
                  </div>
                  <select value={selectedNode.data.filterOp as string || '='} onChange={(e) => onUpdateNode(selectedNode.id, { filterOp: e.target.value })} className="w-16 px-1 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors">
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="IS NULL">IS NULL</option>
                    <option value="IS NOT NULL">IS NOT NULL</option>
                  </select>
                  <div className="flex-1">
                    <ValueSelect column={selectedNode.data.filterCol as string} value={selectedNode.data.filterVal as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { filterVal: val })} placeholder="Value" />
                  </div>
                </div>
              </div>
            )}

            {selectedNode.data.operation === 'sortRows' && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 w-2/3">
                  <label className="text-xs font-semibold text-text-h">Sort Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. created_at" />
                </div>
                <div className="flex flex-col gap-2 w-1/3">
                  <label className="text-xs font-semibold text-text-h">Order</label>
                  <select value={selectedNode.data.direction as string || 'ASC'} onChange={(e) => onUpdateNode(selectedNode.id, { direction: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                    <option value="ASC">ASC</option>
                    <option value="DESC">DESC</option>
                  </select>
                </div>
              </div>
            )}

            {selectedNode.data.operation === 'topN' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Limit (N)</label>
                <input type="number" value={selectedNode.data.limit as string || '10'} onChange={(e) => onUpdateNode(selectedNode.id, { limit: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
            )}

            {selectedNode.data.operation === 'sampleRows' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Sample Percentage (1-100)</label>
                <input type="number" value={selectedNode.data.percent as string || '10'} onChange={(e) => onUpdateNode(selectedNode.id, { percent: e.target.value })} placeholder="e.g. 10" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
            )}

            {selectedNode.data.operation === 'dateTruncate' && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold text-text-h">Date Col</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. date" />
                </div>
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold text-text-h">Truncate To</label>
                  <select value={selectedNode.data.part as string || 'month'} onChange={(e) => onUpdateNode(selectedNode.id, { part: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                    <option value="day">Day</option>
                    <option value="hour">Hour</option>
                  </select>
                </div>
              </div>
            )}

            {selectedNode.data.operation === 'dateArithmetic' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Date Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="Select column" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Amount</label>
                    <input type="number" value={selectedNode.data.amount as string || '1'} onChange={(e) => onUpdateNode(selectedNode.id, { amount: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Interval</label>
                    <select value={selectedNode.data.interval as string || 'DAY'} onChange={(e) => onUpdateNode(selectedNode.id, { interval: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                      <option value="DAY">Days</option>
                      <option value="MONTH">Months</option>
                      <option value="YEAR">Years</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'conditionalLogic' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">If Condition</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <ColumnSelect value={selectedNode.data.condCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { condCol: val })} placeholder="Column" />
                    </div>
                    <select value={selectedNode.data.condOp as string || '='} onChange={(e) => onUpdateNode(selectedNode.id, { condOp: e.target.value })} className="w-16 px-1 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors">
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                    </select>
                    <div className="flex-1">
                      <ValueSelect column={selectedNode.data.condCol as string} value={selectedNode.data.condVal as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { condVal: val })} placeholder="Value" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Then (True)</label>
                    <input type="text" value={selectedNode.data.trueVal as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { trueVal: e.target.value })} placeholder="e.g. Adult" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Else (False)</label>
                    <input type="text" value={selectedNode.data.falseVal as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { falseVal: e.target.value })} placeholder="e.g. Minor" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'splitPart' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. full_name" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Delimiter</label>
                    <input type="text" value={selectedNode.data.delim as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { delim: e.target.value })} placeholder="e.g. ," className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Index (1-based)</label>
                    <input type="number" value={selectedNode.data.index as string || '1'} onChange={(e) => onUpdateNode(selectedNode.id, { index: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'stringLength' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Target Column</label>
                <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. comment" />
              </div>
            )}

            {['innerJoin', 'leftJoin', 'fullOuterJoin', 'antiJoin', 'semiJoin'].includes(selectedNode.data.operation as string) && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Join Condition ({selectedNode.data.operation as string})</label>
                <input 
                  type="text" 
                  value={selectedNode.data.joinCondition as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { joinCondition: e.target.value })}
                  placeholder="e.g. t1.id = t2.user_id"
                  className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
                <span className="text-[10px] text-text-muted">Note: Connect two parent nodes.</span>
              </div>
            )}

            {['unionAll', 'crossJoin', 'intersectNodes', 'exceptNodes'].includes(selectedNode.data.operation as string) && (
              <div className="p-3 bg-code-bg border border-border rounded-md text-xs text-text-muted">
                Combines two incoming parent tables using {selectedNode.data.operation as string}. Connect two parent nodes.
              </div>
            )}

            {['rankRows', 'denseRankRows', 'percentRankRows'].includes(selectedNode.data.operation as string) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Partition By Column</label>
                  <ColumnSelect value={selectedNode.data.partCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { partCol: val })} placeholder="e.g. department" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Order By Column</label>
                  <ColumnSelect value={selectedNode.data.orderCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { orderCol: val })} placeholder="e.g. salary" />
                </div>
              </>
            )}

            {['leadRows', 'lagRows'].includes(selectedNode.data.operation as string) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. price" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Offset</label>
                  <input 
                    type="number" 
                    value={selectedNode.data.offset as string || '1'} 
                    onChange={(e) => onUpdateNode(selectedNode.id, { offset: e.target.value })}
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text"
                  />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'hashColumn' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Column to Hash (MD5)</label>
                <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. email" />
              </div>
            )}

            {selectedNode.data.operation === 'groupBy' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Group By Column</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.groupCol as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { groupCol: e.target.value })}
                    placeholder="e.g. department"
                    className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-2 w-1/3">
                    <label className="text-xs font-semibold text-text-h">Func</label>
                    <select 
                      value={selectedNode.data.aggFunc as string || 'COUNT'}
                      onChange={(e) => onUpdateNode(selectedNode.id, { aggFunc: e.target.value })}
                      className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="COUNT">COUNT</option>
                      <option value="SUM">SUM</option>
                      <option value="AVG">AVG</option>
                      <option value="MIN">MIN</option>
                      <option value="MAX">MAX</option>
                      <option value="MEDIAN">MEDIAN</option>
                      <option value="STDDEV">STDDEV</option>
                      <option value="VARIANCE">VARIANCE</option>
                      <option value="COUNT DISTINCT">COUNT DISTINCT</option>
                      <option value="STRING_AGG">STRING_AGG</option>
                      <option value="FIRST">FIRST</option>
                      <option value="LAST">LAST</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs font-semibold text-text-h">Target Col</label>
                    <input 
                      type="text" 
                      value={selectedNode.data.aggCol as string || ''}
                      onChange={(e) => onUpdateNode(selectedNode.id, { aggCol: e.target.value })}
                      placeholder="e.g. salary"
                      className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {['medianAgg', 'modeAgg', 'stdDevAgg', 'varianceAgg'].includes(selectedNode.data.operation as string) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Group By Column</label>
                  <input type="text" value={selectedNode.data.groupCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { groupCol: e.target.value })} placeholder="e.g. category" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Numeric Column</label>
                  <input type="text" value={selectedNode.data.aggCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { aggCol: e.target.value })} placeholder="e.g. price" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'correlationMatrix' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Column 1</label>
                  <input type="text" value={selectedNode.data.col1 as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { col1: e.target.value })} placeholder="e.g. age" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Column 2</label>
                  <input type="text" value={selectedNode.data.col2 as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { col2: e.target.value })} placeholder="e.g. salary" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
              </>
            )}

            {['movingAverage', 'runningTotal'].includes(selectedNode.data.operation as string) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column (Numeric)</label>
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. amount" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Partition By (Optional)</label>
                  <input type="text" value={selectedNode.data.partCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { partCol: e.target.value })} placeholder="e.g. category" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Order By</label>
                  <input type="text" value={selectedNode.data.orderCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { orderCol: e.target.value })} placeholder="e.g. date" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                {selectedNode.data.operation === 'movingAverage' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-h">Window Size (Rows)</label>
                    <input type="number" value={selectedNode.data.window as string || '3'} onChange={(e) => onUpdateNode(selectedNode.id, { window: e.target.value })} className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">New Column Name</label>
                  <input type="text" value={selectedNode.data.newCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { newCol: e.target.value })} placeholder="e.g. moving_avg" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
              </>
            )}

            {['normalizeColumn', 'standardizeColumn'].includes(selectedNode.data.operation as string) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. score" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">New Column Name</label>
                  <input type="text" value={selectedNode.data.newCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { newCol: e.target.value })} placeholder="e.g. norm_score" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'regexMatch' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. email" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Regex Pattern</label>
                  <input type="text" value={selectedNode.data.pattern as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { pattern: e.target.value })} placeholder="e.g. ^[a-z]+$" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">New Column Name (Boolean)</label>
                  <input type="text" value={selectedNode.data.newCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { newCol: e.target.value })} placeholder="e.g. is_valid" className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'windowFunction' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Partition By Col (Optional)</label>
                  <ColumnSelect value={selectedNode.data.partCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { partCol: val })} placeholder="e.g. department" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Order By Col</label>
                  <ColumnSelect value={selectedNode.data.orderCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { orderCol: val })} placeholder="e.g. date" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Func</label>
                    <select value={selectedNode.data.func as string || 'SUM'} onChange={(e) => onUpdateNode(selectedNode.id, { func: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                      <option value="SUM">Running Total</option>
                      <option value="AVG">Moving Avg</option>
                      <option value="RANK">Rank</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Target Col</label>
                    <ColumnSelect value={selectedNode.data.valCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { valCol: val })} placeholder="e.g. amount" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'pivotTable' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Pivot Column (Becomes Columns)</label>
                  <ColumnSelect value={selectedNode.data.pivotCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { pivotCol: val })} placeholder="e.g. category" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Group By Column</label>
                  <ColumnSelect value={selectedNode.data.groupCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { groupCol: val })} placeholder="e.g. date" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/3">
                    <label className="text-xs font-semibold text-text-h">Agg Func</label>
                    <select value={selectedNode.data.aggFunc as string || 'SUM'} onChange={(e) => onUpdateNode(selectedNode.id, { aggFunc: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                      <option value="SUM">SUM</option>
                      <option value="COUNT">COUNT</option>
                      <option value="AVG">AVG</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs font-semibold text-text-h">Value Col</label>
                    <ColumnSelect value={selectedNode.data.valCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { valCol: val })} placeholder="e.g. amount" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'unpivotTable' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Identifier Column (Keep as Rows)</label>
                  <ColumnSelect value={selectedNode.data.idCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { idCol: val })} placeholder="e.g. date" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Variable Name Col</label>
                    <input type="text" value={selectedNode.data.nameCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { nameCol: e.target.value })} placeholder="e.g. category" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Value Col</label>
                    <ColumnSelect value={selectedNode.data.valCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { valCol: val })} placeholder="e.g. amount" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'rollup' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Rollup Columns (Comma Sep)</label>
                  <input type="text" value={selectedNode.data.groupCols as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { groupCols: e.target.value })} placeholder="e.g. country, city" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/3">
                    <label className="text-xs font-semibold text-text-h">Agg Func</label>
                    <select value={selectedNode.data.aggFunc as string || 'SUM'} onChange={(e) => onUpdateNode(selectedNode.id, { aggFunc: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                      <option value="SUM">SUM</option>
                      <option value="COUNT">COUNT</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs font-semibold text-text-h">Value Col</label>
                    <ColumnSelect value={selectedNode.data.valCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { valCol: val })} placeholder="e.g. sales" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'summaryStats' && (
              <div className="p-3 bg-code-bg border border-border rounded-md text-xs text-text-muted">
                This node profiles your data automatically, outputting MIN, MAX, AVG, COUNT, and STDDEV for all numeric columns. No configuration needed!
              </div>
            )}


            {selectedNode.data.operation === 'mathFormula' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Formula</label>
                <input type="text" value={selectedNode.data.formula as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { formula: e.target.value })} placeholder="e.g. (salary * 1.2) + bonus" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
            )}

            {selectedNode.data.operation === 'extractYear' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Date/Timestamp Column</label>
                <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. created_at" />
              </div>
            )}

            {selectedNode.data.operation === 'regexReplace' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. text" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Regex Pattern</label>
                  <input type="text" value={selectedNode.data.pattern as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { pattern: e.target.value })} placeholder="e.g. [0-9]+" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Replacement</label>
                  <input type="text" value={selectedNode.data.replacement as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { replacement: e.target.value })} placeholder="e.g. NUM" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'substringCol' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. name" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Start Index (1-based)</label>
                    <input type="number" value={selectedNode.data.start as string || '1'} onChange={(e) => onUpdateNode(selectedNode.id, { start: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Length</label>
                    <input type="number" value={selectedNode.data.length as string || '10'} onChange={(e) => onUpdateNode(selectedNode.id, { length: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'leftRightString' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <ColumnSelect value={selectedNode.data.column as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { column: val })} placeholder="e.g. name" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Direction</label>
                    <select value={selectedNode.data.direction as string || 'LEFT'} onChange={(e) => onUpdateNode(selectedNode.id, { direction: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                      <option value="LEFT">LEFT</option>
                      <option value="RIGHT">RIGHT</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Length</label>
                    <input type="number" value={selectedNode.data.length as string || '5'} onChange={(e) => onUpdateNode(selectedNode.id, { length: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'dateDiff' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Start Date Column</label>
                  <ColumnSelect value={selectedNode.data.startCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { startCol: val })} placeholder="e.g. created_at" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">End Date Column</label>
                  <ColumnSelect value={selectedNode.data.endCol as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { endCol: val })} placeholder="e.g. updated_at" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Difference In</label>
                  <select value={selectedNode.data.datePart as string || 'day'} onChange={(e) => onUpdateNode(selectedNode.id, { datePart: e.target.value })} className="px-2 py-2 bg-code-bg border border-border rounded-md text-sm text-text">
                    <option value="day">Days</option>
                    <option value="month">Months</option>
                    <option value="year">Years</option>
                  </select>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'aiTransform' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">AI Prompt (What do you want to do?)</label>
                <textarea 
                  value={selectedNode.data.prompt as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { prompt: e.target.value })}
                  placeholder="e.g. Keep only active users and create a new column for their full name"
                  className="flex-1 p-3 min-h-[100px] bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors resize-none"
                />
                <button 
                  onClick={() => onAIGenerate && onAIGenerate(selectedNode.id, selectedNode.data.prompt as string)}
                  className="w-full mt-2 bg-accent text-white py-2 rounded-md text-sm font-medium hover-lift"
                >
                  Generate SQL with AI
                </button>
              </div>
            )}

            {selectedNode.data.operation === 'exportCsv' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Export File Path</label>
                <input 
                  type="text" 
                  value={selectedNode.data.file as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { file: e.target.value })}
                  placeholder="e.g. output/results.csv"
                  className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {selectedNode.data.operation === 'customSql' && (
              <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
                <label className="text-xs font-semibold text-text-h">SQL Query</label>
                <div className="flex-1 border border-border rounded-md overflow-hidden bg-[#1e1e1e]">
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    theme="vs-dark"
                    value={selectedNode.data.sql as string || ''}
                    onChange={(value) => onUpdateNode(selectedNode.id, { sql: value })}
                    options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', padding: { top: 8 } }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'description' && (
          <div className="flex flex-col gap-2 h-full">
            <label className="text-xs font-semibold text-text-h">Documentation Notes</label>
            <textarea
              value={selectedNode.data.description as string || ''}
              onChange={(e) => onUpdateNode(selectedNode.id, { description: e.target.value })}
              placeholder="Add notes about what this node does..."
              className="flex-1 p-3 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-h">Performance</label>
              <div className="p-3 bg-code-bg border border-border rounded-md text-sm text-text space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Execution Time:</span>
                  <span className="font-mono text-xs text-accent">N/A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Memory Usage:</span>
                  <span className="font-mono text-xs text-accent">N/A</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-h">Data Profiling</label>
              <button 
                onClick={handleProfileNode}
                disabled={profileLoading}
                className="w-full px-3 py-2 bg-accent text-white rounded-md text-sm font-medium hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {profileLoading ? 'Profiling Data...' : 'Run Statistical Profile'}
              </button>
            </div>
            
            {profileData && (
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-semibold text-text-h">Statistics (SUMMARIZE)</label>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar p-2 bg-bg border border-border rounded">
                  {profileData.map((col: any, i: number) => (
                    <div key={i} className="flex flex-col gap-1 p-2 bg-code-bg rounded border border-border text-xs">
                      <div className="font-bold text-accent">{col.column_name} <span className="text-text-muted font-normal">({col.column_type})</span></div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-text mt-1">
                        <div><span className="text-text-muted">Min:</span> {col.min}</div>
                        <div><span className="text-text-muted">Max:</span> {col.max}</div>
                        <div><span className="text-text-muted">Nulls:</span> {col.null_percentage}%</div>
                        <div><span className="text-text-muted">Unique:</span> {col.approx_unique}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>

    <DataPreviewModal 
      previewData={previewData} 
      previewError={previewError} 
      setPreviewData={setPreviewData} 
      setPreviewError={setPreviewError} 
      nodeLabel={selectedNode.data.label as string || ''} 
    />
    </>
  );
}

