"use client";
import { useState, useEffect } from 'react';
import { Variable, Plus, Trash2, Save, X } from 'lucide-react';

export interface GlobalVariable {
  key: string;
  value: string;
}

interface VariableManagerProps {
  onClose: () => void;
}

export default function VariableManager({ onClose }: VariableManagerProps) {
  const [variables, setVariables] = useState<GlobalVariable[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ARCHITECT_VARIABLES') || '[]');
      setVariables(stored);
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem('ARCHITECT_VARIABLES', JSON.stringify(variables));
    onClose();
  };

  const addVariable = () => {
    setVariables([...variables, { key: 'new_var', value: '' }]);
  };

  const removeVariable = (index: number) => {
    const updated = [...variables];
    updated.splice(index, 1);
    setVariables(updated);
  };

  const updateVariable = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...variables];
    updated[index][field] = val;
    setVariables(updated);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-[600px] bg-bg border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-border bg-code-bg">
          <h2 className="text-lg font-bold text-text-h flex items-center gap-2">
            <Variable className="w-5 h-5 text-accent" /> Global Variables
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-text-muted">
            Define global variables here. You can reference them in any node's configuration or SQL by using the syntax <code>{`\${variable_name}`}</code>. They will be evaluated dynamically during execution.
          </p>

          <div className="flex flex-col gap-2 mt-2">
            {variables.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={v.key}
                    onChange={(e) => updateVariable(i, 'key', e.target.value)}
                    placeholder="Variable Key (e.g., env)"
                    className="w-full bg-code-bg border border-border px-3 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={v.value}
                    onChange={(e) => updateVariable(i, 'value', e.target.value)}
                    placeholder="Value (e.g., prod)"
                    className="w-full bg-code-bg border border-border px-3 py-2 rounded-lg text-sm text-text focus:border-accent outline-none"
                  />
                </div>
                <button onClick={() => removeVariable(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <button onClick={addVariable} className="w-full mt-2 py-2 border-2 border-dashed border-border rounded-lg text-text-muted hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Variable
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-code-bg flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-bg border border-border text-text rounded-lg hover:bg-code-bg text-sm font-medium">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg hover-bg-lift flex items-center gap-2 text-sm font-medium shadow-glow">
            <Save className="w-4 h-4" /> Save Variables
          </button>
        </div>

      </div>
    </div>
  );
}
