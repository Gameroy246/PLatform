"use client";

import Canvas from "@/components/Canvas";

import { ReactFlowProvider } from '@xyflow/react';

export default function SecureWorkspace() {
  return (
    <div className="w-full h-screen overflow-hidden">
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </div>
  );
}
