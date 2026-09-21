const fs = require('fs');
let code = fs.readFileSync('src/components/Canvas.tsx', 'utf8');

// Replace the init from local storage
code = code.replace(/useEffect\(\(\) => \{\n\s*const savedPipeline = localStorage\.getItem\('ARCHITECT_PIPELINE'\);\n\s*\/\/ We do NOT load immediately, we let the welcome modal decide\n\s*\}, \[\]\);/, 
`useEffect(() => {
    if (projectId) {
      fetch(\`/api/pipelines?id=\${projectId}\`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.pipeline && data.pipeline.data) {
            setNodes(data.pipeline.data.nodes || []);
            setEdges(sanitizeEdges(data.pipeline.data.edges || []));
            setIsWelcomeModalOpen(false);
          }
        })
        .catch(console.error);
    }
  }, [projectId]);`);

// Replace handleOpenRecent
code = code.replace(/const handleOpenRecent = \(\) => \{[\s\S]*?\}\n    \};\n\n    useEffect\(\(\) => \{/,
`const handleOpenRecent = () => {
      setIsWelcomeModalOpen(false);
    };

    useEffect(() => {`);

// Remove auto-save to ARCHITECT_PIPELINE
code = code.replace(/useEffect\(\(\) => \{\n\s*if \(mounted && nodes\.length > 0\) \{\n\s*const saveTimer = setTimeout\(\(\) => \{\n\s*localStorage\.setItem\('ARCHITECT_PIPELINE', JSON\.stringify\(\{ savedNodes: nodes, savedEdges: edges \}\)\);\n\s*\}, 500\);\n\s*return \(\) => clearTimeout\(saveTimer\);\n\s*\}\n\s*\}, \[nodes, edges, mounted\]\);/, 
`useEffect(() => {
      if (mounted && nodes.length > 0 && projectId) {
        const saveTimer = setTimeout(() => {
          savePipelineToCloud();
        }, 3000); // debounce save
        return () => clearTimeout(saveTimer);
      }
    }, [nodes, edges, mounted, projectId]);`);

fs.writeFileSync('src/components/Canvas.tsx', code);
