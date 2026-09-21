const fs = require('fs');

const path = 'src/components/PropertiesPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const columnSelectStr = `
  const ColumnSelect = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) => (
    <select 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-code-bg border border-border rounded-md text-sm text-text focus:outline-none focus:border-accent transition-colors"
    >
      <option value="" disabled>{placeholder || 'Select a column...'}</option>
      {realtimeSchema.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
    </select>
  );
`;

// Insert ColumnSelect inside PropertiesPanel just before handlePreviewNode
content = content.replace('const handlePreviewNode', columnSelectStr + '\n  const handlePreviewNode');

// Replace specific column inputs
const propsToReplace = ['column', 'oldCol', 'groupCol', 'valCol', 'partCol', 'orderCol', 'pivotCol', 'idCol', 'aggCol'];

for (const prop of propsToReplace) {
  const regex = new RegExp(
    `<input type="text" value=\\{selectedNode\\.data\\.${prop} as string \\|\\| ''\\} onChange=\\{\\(e\\) => onUpdateNode\\(selectedNode\\.id, \\{ ${prop}: e\\.target\\.value \\}\\)\\} (?:placeholder="([^"]+)" )?className="[^"]+" \\/>`,
    'g'
  );
  content = content.replace(regex, (match, placeholder) => {
    return `<ColumnSelect value={selectedNode.data.${prop} as string || ''} onChange={(val) => onUpdateNode(selectedNode.id, { ${prop}: val })} placeholder="${placeholder || 'Select column'}" />`;
  });
}

// Add the Connections UI
const connectionsUI = `
            <div className="flex flex-col gap-2 bg-[#252526] p-3 rounded-md border border-border">
              <span className="text-xs font-bold text-accent mb-1 flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> CONNECTIONS</span>
              <div className="flex flex-col gap-1 text-[11px] text-text-muted">
                {(() => {
                  const incoming = edges.filter(e => e.target === selectedNode.id).map(e => nodes.find(n => n.id === e.source)?.data.label || e.source);
                  const outgoing = edges.filter(e => e.source === selectedNode.id).map(e => nodes.find(n => n.id === e.target)?.data.label || e.target);
                  return (
                    <>
                      <div><strong className="text-text">Incoming:</strong> {incoming.length > 0 ? incoming.join(', ') : 'None (Root Node)'}</div>
                      <div><strong className="text-text">Outgoing:</strong> {outgoing.length > 0 ? outgoing.join(', ') : 'None (Leaf Node)'}</div>
                    </>
                  );
                })()}
              </div>
            </div>
`;

content = content.replace('<div className="flex flex-col gap-2">\n              <label className="text-xs font-semibold text-text-h">Label</label>', connectionsUI + '\n            <div className="flex flex-col gap-2">\n              <label className="text-xs font-semibold text-text-h">Label</label>');

fs.writeFileSync(path, content);
console.log("Replaced successfully!");
