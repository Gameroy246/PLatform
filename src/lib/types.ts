export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    operation?: string;
    file?: string;
    sql?: string;
    column?: string;
    [key: string]: any;
  };
  style?: Record<string, any>;
  selected?: boolean;
  parentNode?: string;
  extent?: 'parent';
  measured?: { width: number; height: number };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface PipelineMetadata {
  columns?: any[];
  summary?: any;
  [key: string]: any;
}
