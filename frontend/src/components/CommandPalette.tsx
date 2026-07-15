import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Play, Settings } from 'lucide-react';

interface CommandPaletteProps {
  onAddNode: (type: string, operation: string) => void;
  onRunPipeline: () => void;
  onOpenVariables?: () => void;
}

export default function CommandPalette({ onAddNode, onRunPipeline, onOpenVariables }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p' || e.key === 'P')) {
        // Prevent default browser search/print
        if (e.key === 'k' || e.shiftKey) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { name: 'Run Pipeline', icon: Play, action: onRunPipeline },
    { name: 'Add Node: CSV Input', icon: Plus, action: () => onAddNode('dataSource', 'csvInput') },
    { name: 'Add Node: JSON Input', icon: Plus, action: () => onAddNode('dataSource', 'jsonInput') },
    { name: 'Add Node: Parquet Input', icon: Plus, action: () => onAddNode('dataSource', 'parquetInput') },
    { name: 'Add Node: Excel Input', icon: Plus, action: () => onAddNode('dataSource', 'excelInput') },
    { name: 'Add Node: PostgreSQL Input', icon: Plus, action: () => onAddNode('dataSource', 'postgresInput') },
    
    { name: 'Add Node: Remove Duplicates', icon: Plus, action: () => onAddNode('transform', 'removeDuplicates') },
    { name: 'Add Node: Remove Nulls', icon: Plus, action: () => onAddNode('transform', 'removeNulls') },
    { name: 'Add Node: Fill Missing', icon: Plus, action: () => onAddNode('transform', 'fillMissing') },
    { name: 'Add Node: Type Cast', icon: Plus, action: () => onAddNode('transform', 'typeConversion') },
    { name: 'Add Node: Trim Whitespace', icon: Plus, action: () => onAddNode('transform', 'trimWhitespace') },
    { name: 'Add Node: Text Casing', icon: Plus, action: () => onAddNode('transform', 'textCasing') },
    { name: 'Add Node: Replace Text', icon: Plus, action: () => onAddNode('transform', 'replaceText') },
    { name: 'Add Node: Regex Extract', icon: Plus, action: () => onAddNode('transform', 'regexExtract') },
    { name: 'Add Node: Drop Columns', icon: Plus, action: () => onAddNode('transform', 'dropColumns') },
    { name: 'Add Node: Rename Column', icon: Plus, action: () => onAddNode('transform', 'renameColumn') },
    
    { name: 'Add Node: Filter Rows', icon: Plus, action: () => onAddNode('transform', 'filterRows') },
    { name: 'Add Node: Sort Rows', icon: Plus, action: () => onAddNode('transform', 'sortRows') },
    { name: 'Add Node: Top N', icon: Plus, action: () => onAddNode('transform', 'topN') },
    { name: 'Add Node: Sample Rows', icon: Plus, action: () => onAddNode('transform', 'sampleRows') },
    { name: 'Add Node: Date Truncate', icon: Plus, action: () => onAddNode('transform', 'dateTruncate') },
    { name: 'Add Node: Date Arithmetic', icon: Plus, action: () => onAddNode('transform', 'dateArithmetic') },
    { name: 'Add Node: If/Then Logic', icon: Plus, action: () => onAddNode('transform', 'conditionalLogic') },
    { name: 'Add Node: Split Part', icon: Plus, action: () => onAddNode('transform', 'splitPart') },
    { name: 'Add Node: String Length', icon: Plus, action: () => onAddNode('transform', 'stringLength') },
    
    { name: 'Add Node: Inner Join', icon: Plus, action: () => onAddNode('transform', 'innerJoin') },
    { name: 'Add Node: Left Join', icon: Plus, action: () => onAddNode('transform', 'leftJoin') },
    { name: 'Add Node: Union All', icon: Plus, action: () => onAddNode('transform', 'unionAll') },
    
    { name: 'Add Node: Group By', icon: Plus, action: () => onAddNode('transform', 'groupBy') },
    { name: 'Add Node: Window Function', icon: Plus, action: () => onAddNode('transform', 'windowFunction') },
    { name: 'Add Node: Pivot Table', icon: Plus, action: () => onAddNode('transform', 'pivotTable') },
    { name: 'Add Node: Unpivot/Melt', icon: Plus, action: () => onAddNode('transform', 'unpivotTable') },
    { name: 'Add Node: Rollup', icon: Plus, action: () => onAddNode('transform', 'rollup') },
    { name: 'Add Node: Summary Stats', icon: Plus, action: () => onAddNode('transform', 'summaryStats') },
    
    { name: 'Add Node: Math Formula', icon: Plus, action: () => onAddNode('transform', 'mathFormula') },
    { name: 'Add Node: Extract Year', icon: Plus, action: () => onAddNode('transform', 'extractYear') },
    
    { name: 'Add Node: Export CSV', icon: Plus, action: () => onAddNode('transform', 'exportCsv') },
    
    { name: 'Add Node: Custom SQL', icon: Plus, action: () => onAddNode('transform', 'customSql') },
    { name: 'Add Node: AI Transform', icon: Plus, action: () => onAddNode('transform', 'aiTransform') },
    
    { name: 'Variables & Settings', icon: Settings, action: () => onOpenVariables && onOpenVariables() },
  ];

  const filteredCommands = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-lg bg-bg border border-border rounded-xl shadow-shadow overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-muted mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-text-h focus:outline-none"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-xs font-mono bg-code-bg px-2 py-1 rounded-md text-text-muted">ESC</span>
        </div>
        
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, i) => (
              <button
                key={i}
                className="w-full flex items-center px-4 py-3 text-sm text-text-h hover:bg-code-bg rounded-lg transition-colors text-left"
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
              >
                <cmd.icon className="w-4 h-4 mr-3 text-accent" />
                {cmd.name}
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-text-muted">No commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
