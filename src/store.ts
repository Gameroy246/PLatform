"use client";
import { create } from 'zustand';

import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';

import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from '@xyflow/react';

type HistoryState = {
  nodes: Node[];
  edges: Edge[];
};

type RFState = {
  nodes: Node[];
  edges: Edge[];
  history: HistoryState[];
  future: HistoryState[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onSelectionChange: (params: { nodes: Node[]; edges: Edge[] }) => void;
  addNode: (node: Node) => void;
  updateNodeData: (id: string, data: any) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  setNodeStatuses: (statuses: Record<string, any>) => void;
};

export const useStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],
  
  saveHistory: () => {
    const { nodes, edges, history } = get();
    set({
      history: [...history, { nodes, edges }].slice(-50),
      future: [],
    });
  },

  undo: () => {
    const { history, future, nodes, edges } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      history: history.slice(0, -1),
      future: [{ nodes, edges }, ...future],
    });
  },

  redo: () => {
    const { history, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      nodes: next.nodes,
      edges: next.edges,
      history: [...history, { nodes, edges }],
      future: future.slice(1),
    });
  },
  
  deleteSelected: () => {
    const { nodes, edges, saveHistory } = get();
    const hasSelectedNodes = nodes.some(n => n.selected);
    const hasSelectedEdges = edges.some(e => e.selected);
    if (!hasSelectedNodes && !hasSelectedEdges) return;
    
    saveHistory();
    set({
      nodes: nodes.filter(n => !n.selected),
      edges: edges.filter(e => !e.selected),
    });
  },

  duplicateSelected: () => {
    const { nodes, saveHistory } = get();
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    
    saveHistory();
    const newNodes = selectedNodes.map(n => ({
      ...n,
      id: `${n.type}-${Math.random().toString(36).substr(2, 9)}`,
      position: { x: n.position.x + 50, y: n.position.y + 50 },
      selected: true,
    }));
    
    set({
      nodes: [...nodes.map(n => ({ ...n, selected: false })), ...newNodes],
    });
  },

  setNodeStatuses: (statuses: Record<string, any>) => {
    set((state) => ({
      nodes: state.nodes.map(n => ({
        ...n,
        style: {
          ...n.style,
          border: statuses[n.id]?.status === 'SUCCESS' ? '2px solid #4ade80' : 
                 statuses[n.id]?.status === 'ERROR' ? '2px solid #f87171' : '1px solid var(--border)',
          boxShadow: statuses[n.id]?.status === 'SUCCESS' ? '0 0 15px rgba(74, 222, 128, 0.2)' : 
                    statuses[n.id]?.status === 'ERROR' ? '0 0 15px rgba(248, 113, 113, 0.2)' : 'none',
          borderRadius: '8px'
        },
        data: {
          ...n.data,
          executionTime: statuses[n.id]?.duration_ms,
          error: statuses[n.id]?.error
        }
      }))
    }));
  },

  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  
  onConnect: (connection: Connection) => {
    get().saveHistory();
    set({ edges: addEdge(connection, get().edges) });
  },
  
  onSelectionChange: () => {
  },
  
  addNode: (node: Node) => {
    get().saveHistory();
    set({ nodes: [...get().nodes, node] });
  },
  
  updateNodeData: (id: string, data: any) => {
    get().saveHistory();
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },
}));
