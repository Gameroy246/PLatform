"use client";
import { useState } from 'react';
import type { Node } from '@xyflow/react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { FolderOpen } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: any) => void;
  onAIGenerate?: (id: string, prompt: string) => Promise<void>;
}

export default function PropertiesPanel({ selectedNode, onUpdateNode, onAIGenerate }: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'description' | 'metadata'>('settings');
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const handlePreviewNode = async () => {
    try {
      setPreviewLoading(true);
      setPreviewError('');
      const res = await axios.get(`http://localhost:8000/api/preview/${selectedNode!.id}`);
      setPreviewData(res.data);
    } catch (err: any) {
      setPreviewError(err.response?.data?.detail || err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleBrowseFile = async () => {
    try {
      setIsBrowsing(true);
      const response = await axios.get('http://localhost:8000/api/browse-file');
      if (response.data.path) {
        onUpdateNode(selectedNode!.id, { file: response.data.path });
      }
    } catch (error) {
      console.error("Failed to browse for file", error);
    } finally {
      setIsBrowsing(false);
    }
  };

  if (!selectedNode) {
    return (
      <aside className="w-72 border-l border-border bg-code-bg p-4 z-10 hidden lg:block relative">
        <h2 className="text-xs font-bold text-text uppercase tracking-wider !m-0 mb-2">
          Properties
        </h2>
        <div className="p-4 border border-dashed border-border bg-code-bg rounded-lg text-center text-sm mt-4">
          Select a node to view settings
        </div>
      </aside>
    );
  }

  return (
    <>
    <aside className="w-72 border-l border-border bg-code-bg flex flex-col z-10 hidden lg:block relative">
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
                  onClick={handlePreviewNode} 
                  disabled={previewLoading}
                  className="p-2 bg-accent text-white rounded hover-lift disabled:opacity-50" 
                  title="Preview Schema & Data for this Node"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-h">Label</label>
              <input 
                type="text" 
                value={selectedNode.data.label as string || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
                className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {(selectedNode.data.operation === 'csvInput' || selectedNode.data.operation === 'jsonInput' || selectedNode.data.operation === 'parquetInput' || selectedNode.data.operation === 'excelInput') && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">File Path</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={selectedNode.data.file as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { file: e.target.value })}
                    placeholder="e.g. data.csv"
                    className="flex-1 px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors min-w-0"
                  />
                  <button 
                    onClick={handleBrowseFile}
                    disabled={isBrowsing}
                    className="px-3 py-2 bg-accent text-white rounded-md text-sm font-medium hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>
              </div>
            )}

            {selectedNode.data.operation === 'postgresInput' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Connection String</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.connection_string as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { connection_string: e.target.value })}
                    placeholder="postgresql://user:pass@localhost:5432/db"
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Table Name</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.table as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { table: e.target.value })}
                    placeholder="e.g. users"
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </>
            )}

            {selectedNode.data.operation === 'removeDuplicates' && (
               <div className="p-3 bg-code-bg border border-border rounded-md text-xs text-text-muted">
                 This node automatically removes all exact duplicate rows from the incoming data. No configuration needed.
               </div>
            )}

            {selectedNode.data.operation === 'removeNulls' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Target Column (Optional)</label>
                <input 
                  type="text" 
                  value={selectedNode.data.column as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })}
                  placeholder="e.g. email (defaults to 'id')"
                  className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {selectedNode.data.operation === 'fillMissing' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.column as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })}
                    placeholder="e.g. age"
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Default Value (String or Number)</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.defaultVal as string || ''}
                    onChange={(e) => onUpdateNode(selectedNode.id, { defaultVal: e.target.value })}
                    placeholder="e.g. 0 or 'Unknown'"
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
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
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
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
                <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. name" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
              </div>
            )}

            {selectedNode.data.operation === 'textCasing' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Target Column</label>
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. status" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors" />
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
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. description" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Old Text</label>
                    <input type="text" value={selectedNode.data.oldText as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { oldText: e.target.value })} placeholder="e.g. Foo" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. email" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                  <input type="text" value={selectedNode.data.oldCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { oldCol: e.target.value })} placeholder="e.g. user_id" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold text-text-h">New Name</label>
                  <input type="text" value={selectedNode.data.newCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { newCol: e.target.value })} placeholder="e.g. id" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
              </div>
            )}


            {selectedNode.data.operation === 'filterRows' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">SQL Condition</label>
                <input 
                  type="text" 
                  value={selectedNode.data.condition as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { condition: e.target.value })}
                  placeholder="e.g. age > 18 AND status = 'active'"
                  className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {selectedNode.data.operation === 'sortRows' && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 w-2/3">
                  <label className="text-xs font-semibold text-text-h">Sort Column</label>
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. created_at" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. date" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                  <input type="text" value={selectedNode.data.condition as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { condition: e.target.value })} placeholder="e.g. age > 18" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                  <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. full_name" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. comment" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
            )}

            {selectedNode.data.operation === 'innerJoin' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Join Condition</label>
                <input 
                  type="text" 
                  value={selectedNode.data.joinCondition as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { joinCondition: e.target.value })}
                  placeholder="e.g. t1.id = t2.user_id"
                  className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
                <span className="text-[10px] text-text-muted">Note: Connect exactly two parent nodes.</span>
              </div>
            )}

            {selectedNode.data.operation === 'leftJoin' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-h">Join Condition (Left Join)</label>
                <input 
                  type="text" 
                  value={selectedNode.data.joinCondition as string || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { joinCondition: e.target.value })}
                  placeholder="e.g. t1.id = t2.user_id"
                  className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
                <span className="text-[10px] text-text-muted">Note: Connect exactly two parent nodes.</span>
              </div>
            )}

            {selectedNode.data.operation === 'unionAll' && (
              <div className="p-3 bg-code-bg border border-border rounded-md text-xs text-text-muted">
                This node vertically appends two tables together. Both incoming nodes must have identical columns. Connect exactly two parent nodes.
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
                    className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
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
                      className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'windowFunction' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Partition By Col (Optional)</label>
                  <input type="text" value={selectedNode.data.partCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { partCol: e.target.value })} placeholder="e.g. department" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Order By Col</label>
                  <input type="text" value={selectedNode.data.orderCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { orderCol: e.target.value })} placeholder="e.g. date" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                    <input type="text" value={selectedNode.data.valCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { valCol: e.target.value })} placeholder="e.g. amount" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'pivotTable' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Pivot Column (Becomes Columns)</label>
                  <input type="text" value={selectedNode.data.pivotCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { pivotCol: e.target.value })} placeholder="e.g. category" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-text-h">Group By Column</label>
                  <input type="text" value={selectedNode.data.groupCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { groupCol: e.target.value })} placeholder="e.g. date" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                    <input type="text" value={selectedNode.data.valCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { valCol: e.target.value })} placeholder="e.g. amount" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                </div>
              </>
            )}

            {selectedNode.data.operation === 'unpivotTable' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-h">Identifier Column (Keep as Rows)</label>
                  <input type="text" value={selectedNode.data.idCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { idCol: e.target.value })} placeholder="e.g. date" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Variable Name Col</label>
                    <input type="text" value={selectedNode.data.nameCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { nameCol: e.target.value })} placeholder="e.g. category" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs font-semibold text-text-h">Value Col</label>
                    <input type="text" value={selectedNode.data.valCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { valCol: e.target.value })} placeholder="e.g. amount" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                    <input type="text" value={selectedNode.data.valCol as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { valCol: e.target.value })} placeholder="e.g. sales" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
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
                <input type="text" value={selectedNode.data.column as string || ''} onChange={(e) => onUpdateNode(selectedNode.id, { column: e.target.value })} placeholder="e.g. created_at" className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text" />
              </div>
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
                  className="px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
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
              <label className="text-xs font-semibold text-text-h">Validation</label>
              <div className="p-3 bg-code-bg border border-border rounded-md text-sm text-text">
                <span className="text-green-400 flex items-center gap-2">✓ No errors detected</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* Preview Modal */}
    {previewData && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewData(null)}>
        <div className="w-[80vw] max-w-4xl max-h-[80vh] bg-bg border border-border rounded-xl shadow-shadow flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-border flex justify-between items-center glass-header">
            <h2 className="text-lg font-bold text-text-h !m-0">Schema & Data Preview: {(selectedNode.data.label as string)}</h2>
            <button onClick={() => setPreviewData(null)} className="text-text-muted hover:text-text-h">Close</button>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-code-bg">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-text-h mb-2">Columns Schema</h3>
              <div className="flex flex-wrap gap-2">
                {previewData.columns.map((c: any, i: number) => (
                  <div key={i} className="px-2 py-1 bg-bg border border-border rounded text-xs font-mono">
                    <span className="text-accent">{c.name}</span> <span className="text-text-muted">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <h3 className="text-sm font-bold text-text-h mb-2">Sample Data (Top 10)</h3>
            <div className="overflow-x-auto border border-border rounded bg-bg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-code-bg">
                  <tr>
                    {previewData.columns.map((c: any, i: number) => (
                      <th key={i} className="p-2 border-b border-r border-border font-semibold text-text-h whitespace-nowrap">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.sample_data.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border hover:bg-code-bg/50">
                      {previewData.columns.map((c: any, j: number) => (
                        <td key={j} className="p-2 border-r border-border whitespace-nowrap text-text font-mono truncate max-w-[200px]">{String(row[c.name] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Error Modal */}
    {previewError && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewError('')}>
        <div className="w-full max-w-md p-6 bg-bg border border-red-500/50 rounded-xl shadow-shadow text-center" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-red-400 mb-2">Preview Unavailable</h3>
          <p className="text-sm text-text mb-4">{previewError}</p>
          <button onClick={() => setPreviewError('')} className="px-4 py-2 bg-code-bg text-text-h rounded hover-lift">Close</button>
        </div>
      </div>
    )}
    </>
  );
}

