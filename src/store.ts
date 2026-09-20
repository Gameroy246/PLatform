"use client";
import { create } from 'zustand';
import { produce } from 'immer';

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
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  favorites: string[];
  addFavorite: (operation: string) => void;
  removeFavorite: (operation: string) => void;
  setFavorites: (favs: string[]) => void;
  tracedNodeId: string | null;
  setTracedNodeId: (id: string | null) => void;
};

export const useStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  history: [],
  future: [],
  favorites: [],
  addFavorite: (operation: string) => set(state => {
    const newFavs = [...new Set([...state.favorites, operation])];
    return { favorites: newFavs };
  }),
  removeFavorite: (operation: string) => set(state => {
    const newFavs = state.favorites.filter(f => f !== operation);
    return { favorites: newFavs };
  }),
  setFavorites: (favs: string[]) => set({ favorites: favs }),
  
  tracedNodeId: null,
  setTracedNodeId: (id: string | null) => set({ tracedNodeId: id }),

  saveHistory: () => {
    const { nodes, edges, history } = get();
    // Only push if there's an actual difference to avoid memory bloat on no-ops
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (JSON.stringify(last.nodes) === JSON.stringify(nodes) && JSON.stringify(last.edges) === JSON.stringify(edges)) {
        return;
      }
    }
    set(produce((state) => {
      state.history.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
      if (state.history.length > 15) state.history.shift();
      state.future = [];
    }));
  },

  undo: () => {
    set(produce((state) => {
      if (state.history.length === 0) return;
      const previous = state.history.pop();
      state.future.unshift({ nodes: state.nodes, edges: state.edges });
      state.nodes = previous.nodes;
      state.edges = previous.edges;
    }));
  },

  redo: () => {
    set(produce((state) => {
      if (state.future.length === 0) return;
      const next = state.future.shift();
      state.history.push({ nodes: state.nodes, edges: state.edges });
      state.nodes = next.nodes;
      state.edges = next.edges;
    }));
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
        data: {
          ...n.data,
          status: statuses[n.id]?.status,
          executionTime: statuses[n.id]?.duration_ms,
          error: statuses[n.id]?.error,
          metrics: statuses[n.id]?.metrics
        }
      }))
    }));
  },

  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  
  setNodes: (nodes: Node[]) => set({ nodes }),
  setEdges: (edges: Edge[]) => set({ edges }),
  
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
