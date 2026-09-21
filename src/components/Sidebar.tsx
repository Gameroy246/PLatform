import React from 'react';
import { Star, ChevronDown, ChevronRight, FileInput, Filter, ArrowRightLeft, Calculator, FolderOutput } from 'lucide-react';
import { PipelineNode, PipelineEdge, PipelineMetadata } from '../lib/types';


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
  userFeatures?: string[];
}

export default function Sidebar(props: SidebarProps) {
  const { userFeatures = ['all'] } = props;

  const NodeItem = ({ type, operation, label }: { type: string, operation: string, label: string }) => {
    if (!userFeatures.includes('all') && !userFeatures.includes(operation)) return null;
    return (
      <div 
        onDragStart={(e: any) => props.onDragStart(e, type, operation)} 
        draggable 
        className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors"
      >
        {label}
      </div>
    );
  };
  const {
    sidebarSearch, setSidebarSearch, labelMap, macros, onDragStart, saveMacro,
    favorites, toggleCategory, expandedCategories
  } = props;

  return (
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
            {sidebarSearch ? (
              <div className="flex flex-col gap-1">
                {Object.entries(labelMap)
                  .filter(([key, label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase()) && (userFeatures.includes('all') || userFeatures.includes(key)))
                  .map(([key, label]) => (
                    <div 
                      key={key} 
                      onDragStart={(e: any) => props.onDragStart(e, ['csvInput', 'postgresInput', 'jsonInput', 'parquetInput', 'excelInput', 'restApiInput', 'graphQLInput', 'xmlInput', 'avroInput', 'orcInput', 'featherInput', 'fixedWidthInput', 'sqliteInput', 'duckdbInput', 'mysqlInput', 'sqlserverInput', 'mongodbInput'].includes(key) ? 'dataSource' : 'transform', key)} 
                      draggable 
                      className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors"
                    >
                      {label}
                    </div>
                  ))}
                {macros.filter(m => m.name.toLowerCase().includes(sidebarSearch.toLowerCase())).map(macro => (
                  <div key={macro.id} onDragStart={(e: any) => onDragStart(e, 'macro', macro.id)} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">
                    {macro.name} (Macro)
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Documentation & Groups */}
                <div className="mb-2">
              <div className="flex flex-col gap-2">
                <button onClick={saveMacro} className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg text-xs font-medium text-text transition-colors flex items-center justify-between">
                  💾 Save as Macro
                </button>
                {(userFeatures.includes('all') || userFeatures.includes('stickyNote')) && (
                  <div 
                    onDragStart={(e: any) => props.onDragStart(e, 'stickyNote', 'stickyNote')} 
                    draggable 
                    className="p-2 border border-yellow-500/40 rounded-md bg-yellow-500/10 hover:border-yellow-500 cursor-grab text-xs font-medium text-yellow-600 dark:text-yellow-400 transition-colors flex items-center justify-between"
                  >
                    📝 Add Sticky Note
                  </div>
                )}
                {(userFeatures.includes('all') || userFeatures.includes('groupNode')) && (
                  <div 
                    onDragStart={(e: any) => props.onDragStart(e, 'groupNode', 'groupNode')} 
                    draggable 
                    className="p-2 border border-accent/40 rounded-md bg-accent/10 hover:border-accent cursor-grab text-xs font-medium text-accent transition-colors flex items-center justify-between"
                  >
                    📦 Add Group Container
                  </div>
                )}
                {(userFeatures.includes('all') || userFeatures.includes('aiTransform')) && (
                  <div 
                    onDragStart={(e: any) => props.onDragStart(e, 'aiTransform', 'aiTransform')} 
                    draggable 
                    className="p-2 border border-purple-500/40 rounded-md bg-purple-500/10 hover:border-purple-500 cursor-grab text-xs font-medium text-purple-600 dark:text-purple-400 transition-colors flex items-center justify-between"
                  >
                    ✨ AI Transform Node
                  </div>
                )}
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
                    {favorites.filter(fav => userFeatures.includes('all') || userFeatures.includes(fav)).map(fav => (
                      <div key={`fav-${fav}`} onDragStart={(e: any) => props.onDragStart(e, ['csvInput', 'postgresInput', 'jsonInput', 'parquetInput', 'excelInput', 'restApiInput', 'graphQLInput', 'xmlInput', 'avroInput', 'orcInput', 'featherInput', 'fixedWidthInput', 'sqliteInput', 'duckdbInput'].includes(fav) ? 'dataSource' : 'transform', fav)} draggable className="p-2 border border-border rounded-md bg-code-bg hover:border-accent-border hover:bg-accent-bg cursor-grab active:cursor-grabbing text-xs text-text transition-colors">
                        {labelMap[fav] || fav}
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
                  <NodeItem type="dataSource" operation="csvInput" label="CSV Input" />
                  <NodeItem type="dataSource" operation="jsonInput" label="JSON Input" />
                  <NodeItem type="dataSource" operation="parquetInput" label="Parquet Input" />
                  <NodeItem type="dataSource" operation="excelInput" label="Excel Input" />

                  <NodeItem type="dataSource" operation="postgresInput" label="PostgreSQL (Mock)" />
                  <NodeItem type="dataSource" operation="restApiInput" label="REST API" />
                  <NodeItem type="dataSource" operation="graphQLInput" label="GraphQL" />
                  <NodeItem type="dataSource" operation="xmlInput" label="XML Input" />
                  <NodeItem type="dataSource" operation="avroInput" label="Avro Input" />
                  <NodeItem type="dataSource" operation="orcInput" label="ORC Input" />
                  <NodeItem type="dataSource" operation="featherInput" label="Feather Input" />
                  <NodeItem type="dataSource" operation="fixedWidthInput" label="Fixed Width" />
                  <NodeItem type="dataSource" operation="sqliteInput" label="SQLite DB" />
                  <NodeItem type="dataSource" operation="duckdbInput" label="DuckDB File" />
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
                  <NodeItem type="transform" operation="removeNulls" label="Remove Nulls" />
                  <NodeItem type="transform" operation="removeDuplicates" label="Remove Duplicates" />
                  <NodeItem type="transform" operation="duplicateAnalysis" label="Duplicate Analysis" />
                  <NodeItem type="transform" operation="fillMissing" label="Fill Missing" />
                  <NodeItem type="transform" operation="typeConversion" label="Type Cast" />
                  <NodeItem type="transform" operation="trimWhitespace" label="Trim Whitespace" />
                  <NodeItem type="transform" operation="textCasing" label="Text Casing" />
                  <NodeItem type="transform" operation="replaceText" label="Replace Text" />
                  <NodeItem type="transform" operation="regexExtract" label="Regex Extract" />
                  <NodeItem type="transform" operation="dropColumns" label="Drop Columns" />
                  <NodeItem type="transform" operation="renameColumn" label="Rename Column" />
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
                  <NodeItem type="transform" operation="filterRows" label="Filter Rows" />
                  <NodeItem type="transform" operation="sortRows" label="Sort Rows" />
                  <NodeItem type="transform" operation="topN" label="Top N" />
                  <NodeItem type="transform" operation="sampleRows" label="Sample Rows" />
                  <NodeItem type="transform" operation="dateTruncate" label="Date Truncate" />
                  <NodeItem type="transform" operation="dateArithmetic" label="Date Arithmetic" />
                  <NodeItem type="transform" operation="conditionalLogic" label="If/Then Logic" />
                  <NodeItem type="transform" operation="splitPart" label="Split Part" />
                  <NodeItem type="transform" operation="stringLength" label="String Length" />
                  <NodeItem type="transform" operation="mathFormula" label="Math Formula" />
                  <NodeItem type="transform" operation="extractYear" label="Extract Year" />
                  <NodeItem type="transform" operation="innerJoin" label="Inner Join" />
                  <NodeItem type="transform" operation="leftJoin" label="Left Join" />
                  <NodeItem type="transform" operation="unionAll" label="Union All" />
                  <NodeItem type="transform" operation="customSql" label="Custom SQL" />
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
                  <NodeItem type="transform" operation="groupBy" label="Group By" />
                  <NodeItem type="transform" operation="windowFunction" label="Window Function" />
                  <NodeItem type="transform" operation="pivotTable" label="Pivot Table" />
                  <NodeItem type="transform" operation="unpivotTable" label="Unpivot/Melt" />
                  <NodeItem type="transform" operation="rollup" label="Rollup" />
                  <NodeItem type="transform" operation="summaryStats" label="Summary Stats" />
                  <NodeItem type="transform" operation="outlierDetection" label="Outlier Detection" />
                  <NodeItem type="transform" operation="medianAgg" label="Median" />
                  <NodeItem type="transform" operation="modeAgg" label="Mode" />
                  <NodeItem type="transform" operation="stdDevAgg" label="Std Dev" />
                  <NodeItem type="transform" operation="varianceAgg" label="Variance" />
                  <NodeItem type="transform" operation="correlationMatrix" label="Correlation Matrix" />
                  <NodeItem type="transform" operation="movingAverage" label="Moving Average" />
                  <NodeItem type="transform" operation="runningTotal" label="Running Total" />
                  <NodeItem type="transform" operation="normalizeColumn" label="Normalize" />
                  <NodeItem type="transform" operation="standardizeColumn" label="Standardize" />
                  <NodeItem type="transform" operation="regexMatch" label="Regex Match" />
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
                  <NodeItem type="transform" operation="exportCsv" label="Export to CSV" />
                </div>
              )}
            </div>

              </>
            )}
          </div>
        </aside>
  );
}
