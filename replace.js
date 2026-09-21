const fs = require('fs');
let code = fs.readFileSync('src/components/Canvas.tsx', 'utf8');

// Remove Admin and Logout buttons
code = code.replace(/\{userRole === 'SUPERUSER' && onOpenAdmin && \([\s\S]*?\}\)/, '');
code = code.replace(/\{onLogout && \([\s\S]*?\}\)/, '');

// Update handleSavePipelineToFile to savePipelineToCloud
code = code.replace(/const handleSavePipelineToFile = \(\) => \{[\s\S]*?a\.click\(\);\n  \};/, `const savePipelineToCloud = async () => {
    if (!projectId) return;
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          name: 'Canvas Sync', // It will update the existing pipeline
          nodes,
          edges
        })
      });
      if (res.ok) {
        showToast('Pipeline saved to cloud.', 'success');
      } else {
        showToast('Failed to save pipeline.', 'error');
      }
    } catch (e) {
      showToast('Error saving pipeline.', 'error');
    }
  };`);

// Update Save button onClick
code = code.replace(/onClick=\{handleSavePipelineToFile\}/, 'onClick={savePipelineToCloud}');

// Add useEffect to load pipeline from cloud
code = code.replace(/useEffect\(\(\) => \{\n\s*const savedPipeline = localStorage\.getItem\('ARCHITECT_PIPELINE'\);\n\s*\/\/ We do NOT load immediately, we let the welcome modal decide\n\s*\}, \[\]\);/, `useEffect(() => {
    if (projectId) {
      fetch(\`/api/pipelines?id=\${projectId}\`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.pipeline && data.pipeline.data) {
            setNodes(data.pipeline.data.nodes || []);
            setEdges(data.pipeline.data.edges || []);
            setIsWelcomeModalOpen(false); // Hide welcome modal if loading from cloud
          }
        })
        .catch(console.error);
    }
  }, [projectId]);`);

fs.writeFileSync('src/components/Canvas.tsx', code);
