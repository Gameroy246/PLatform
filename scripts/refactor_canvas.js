const fs = require('fs');

let content = fs.readFileSync('d:/Architect/src/components/Canvas.tsx', 'utf8');

const headerStart = content.indexOf('<header');
const headerEnd = content.indexOf('</header>') + '</header>'.length;
const asideStart = content.indexOf('<aside');
const asideEnd = content.indexOf('</aside>') + '</aside>'.length;
const footerStart = content.indexOf('<footer');
const footerEnd = content.indexOf('</footer>') + '</footer>'.length;

const p1 = content.substring(0, headerStart);
const p2 = content.substring(headerEnd, asideStart);
const p3 = content.substring(asideEnd, footerStart);
const p4 = content.substring(footerEnd);

let newCanvas = p1 + `      <TopBar 
        onBack={onBack}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        pipelineFileInputRef={pipelineFileInputRef}
        handleLoadPipelineFromFile={handleLoadPipelineFromFile}
        handleSavePipelineToFile={handleSavePipelineToFile}
        setNodes={setNodes}
        autoLayout={autoLayout}
        handleMagicLayout={handleMagicLayout}
        groupNodes={groupNodes}
        alignLeft={alignLeft}
        alignTop={alignTop}
        distributeHorizontally={distributeHorizontally}
        setShowVariablesModal={setShowVariablesModal}
        setShowCredentialsModal={setShowCredentialsModal}
        theme={theme}
        mounted={mounted}
        setTheme={setTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearchNode={handleSearchNode}
        handleRunPipeline={handleRunPipeline}
        isRunning={isRunning}
      />` + p2 + `        <Sidebar 
          sidebarSearch={sidebarSearch}
          setSidebarSearch={setSidebarSearch}
          labelMap={labelMap}
          macros={macros}
          onDragStart={onDragStart}
          saveMacro={saveMacro}
          favorites={favorites}
          toggleCategory={toggleCategory}
          expandedCategories={expandedCategories}
        />` + p3 + `      <BottomPanel 
        consoleHeight={consoleHeight}
        setIsResizingConsole={setIsResizingConsole}
        activeConsoleTab={activeConsoleTab}
        setActiveConsoleTab={setActiveConsoleTab}
        selectedNode={selectedNode}
        fetchInputPreview={fetchInputPreview}
        nodes={nodes}
        edges={edges}
        sqlOutput={sqlOutput}
        explainPlan={explainPlan}
        executionLogs={executionLogs}
        previewData={previewData}
        inputPreviewData={inputPreviewData}
        pipelineMetadata={pipelineMetadata}
        downloadUrl={downloadUrl}
        outputFormat={outputFormat}
        setOutputFormat={setOutputFormat}
        theme={theme}
        projectId={projectId}
        showToast={showToast}
        setPreviewData={setPreviewData}
      />` + p4;

// Add imports
newCanvas = newCanvas.replace(
  "import { Play, Database, ChevronDown, ChevronRight, FileInput, Filter, Calculator, ArrowRightLeft, FolderOutput, Sun, Moon, Star, Save, Download, FolderOpen, Code, Menu, MoreVertical, LayoutGrid, TerminalSquare, Activity, PieChart, History as HistoryIcon, ShieldCheck, ListTree, ArrowLeft } from 'lucide-react';",
  `import { Play, Database, ChevronDown, ChevronRight, FileInput, Filter, Calculator, ArrowRightLeft, FolderOutput, Sun, Moon, Star, Save, Download, FolderOpen, Code, Menu, MoreVertical, LayoutGrid, TerminalSquare, Activity, PieChart, History as HistoryIcon, ShieldCheck, ListTree, ArrowLeft } from 'lucide-react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomPanel from './BottomPanel';
import { saveProjectData, loadProjectData, saveSnapshots, loadSnapshots } from '../lib/storage';`
);

fs.writeFileSync('d:/Architect/src/components/Canvas.tsx', newCanvas);

console.log('Finished refactoring Canvas!');
