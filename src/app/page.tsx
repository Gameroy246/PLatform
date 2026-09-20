"use client";
import { useState } from 'react';
import Canvas from "@/components/Canvas";
import ProjectDashboard from "@/components/ProjectDashboard";
import { ReactFlowProvider } from '@xyflow/react';
import { ArrowLeft } from 'lucide-react';

export default function SecureWorkspace() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col relative">
      {!activeProjectId ? (
        <ProjectDashboard onOpenProject={setActiveProjectId} />
      ) : (
        <ReactFlowProvider>
          <Canvas projectId={activeProjectId} onBack={() => setActiveProjectId(null)} />
        </ReactFlowProvider>
      )}
    </div>
  );
}
