import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';

const GroupNode = ({ data, selected }: NodeProps) => {
  return (
    <>
      <NodeResizer color="var(--accent)" isVisible={selected} minWidth={200} minHeight={200} />
      <div className="w-full h-full bg-social-bg/5 border-2 border-dashed border-accent/50 rounded-xl relative group">
        <div className="absolute -top-3 left-4 bg-bg px-2 text-xs font-bold text-accent tracking-widest uppercase shadow-sm border border-accent/20 rounded">
          {String(data.label || 'Group')}
        </div>
      </div>
    </>
  );
};

export default memo(GroupNode);
