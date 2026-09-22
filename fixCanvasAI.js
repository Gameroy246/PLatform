const fs = require('fs');
let code = fs.readFileSync('src/components/Canvas.tsx', 'utf8');

if (!code.includes('AIPipelineBuilderModal')) {
  code = code.replace(/import PropertiesPanel from '\.\/PropertiesPanel';/g, "import PropertiesPanel from './PropertiesPanel';\nimport AIPipelineBuilderModal from './AIPipelineBuilderModal';");
}
if (!code.includes('const [isAIModalOpen')) {
  code = code.replace(/const \[isRunning, setIsRunning\] = useState\(false\);/g, "const [isRunning, setIsRunning] = useState(false);\n  const [isAIModalOpen, setIsAIModalOpen] = useState(false);");
}
if (!code.includes('<AIPipelineBuilderModal')) {
  code = code.replace(/\{\/\* Main Canvas Area \*\/\}/g, `{isAIModalOpen && (
        <AIPipelineBuilderModal 
          onClose={() => setIsAIModalOpen(false)}
          onGenerate={(pipeline) => {
            setNodes(pipeline.nodes);
            setEdges(pipeline.edges);
          }}
        />
      )}

      {/* Main Canvas Area */}`);
}
fs.writeFileSync('src/components/Canvas.tsx', code);
