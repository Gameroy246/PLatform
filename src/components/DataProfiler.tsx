import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, ShieldAlert, Fingerprint, Hash, LayoutGrid, Type } from 'lucide-react';

interface ProfilingData {
  column_name: string;
  column_type: string;
  min: string;
  max: string;
  approx_unique: string;
  avg: string;
  std: string;
  q25: string;
  q50: string;
  q75: string;
  null_percentage: string;
}

export default function DataProfiler({ data, rowCount }: { data: ProfilingData[], rowCount: number }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-text-muted p-4">No profiling data available. Run the pipeline to generate statistics.</div>;
  }

  // Calculate overall Data Quality Score (100 - avg null percentage)
  const avgNullPercentage = data.reduce((acc, col) => acc + parseFloat(col.null_percentage || '0'), 0) / data.length;
  const dqScore = Math.max(0, Math.round(100 - avgNullPercentage));
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      
      {/* Header Stats */}
      <div className="flex gap-4 items-stretch">
        <div className="p-6 bg-code-bg border border-border rounded-xl flex-1 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Data Quality Score</h3>
            <div className={`text-4xl font-black ${getScoreColor(dqScore)}`}>
              {dqScore} <span className="text-xl text-text-muted font-medium">/ 100</span>
            </div>
          </div>
          {dqScore >= 90 ? <ShieldCheck className="w-12 h-12 text-green-500/20" /> : <ShieldAlert className="w-12 h-12 text-red-500/20" />}
        </div>
        
        <div className="p-6 bg-code-bg border border-border rounded-xl flex-1 flex flex-col justify-center shadow-sm">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Dataset Overview</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-text-h flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-accent" /> {data.length}</p>
              <p className="text-xs text-text-muted mt-1">Columns</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-h flex items-center gap-2"><Hash className="w-5 h-5 text-accent" /> {rowCount.toLocaleString()}</p>
              <p className="text-xs text-text-muted mt-1">Total Rows</p>
            </div>
          </div>
        </div>
      </div>

      {/* Column Cards */}
      <h3 className="text-sm font-bold text-text-h uppercase tracking-wider mt-4">Column Profiles</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((col, i) => {
          const isNumeric = ['BIGINT', 'DOUBLE', 'INTEGER', 'FLOAT', 'DECIMAL', 'HUGEINT'].includes(col.column_type);
          const nullPct = parseFloat(col.null_percentage || '0');
          const completeness = 100 - nullPct;
          
          return (
            <div key={i} className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-accent/50 transition-colors">
              
              {/* Card Header */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-text-h flex items-center gap-1.5 truncate max-w-[180px]" title={col.column_name}>
                    {isNumeric ? <Hash className="w-4 h-4 text-accent" /> : <Type className="w-4 h-4 text-accent" />}
                    {col.column_name}
                  </h4>
                  <span className="text-xs font-mono text-text-muted bg-code-bg px-1.5 py-0.5 rounded mt-1 inline-block border border-border/50">{col.column_type}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-text flex items-center gap-1 justify-end"><Fingerprint className="w-3 h-3 text-text-muted"/> {col.approx_unique}</div>
                  <div className="text-[10px] text-text-muted uppercase">Unique</div>
                </div>
              </div>

              {/* Completeness Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted font-medium">Completeness</span>
                  <span className={completeness === 100 ? 'text-green-500 font-bold' : 'text-text font-bold'}>{completeness.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-code-bg rounded-full overflow-hidden border border-border/50">
                  <div 
                    className={`h-full ${completeness === 100 ? 'bg-green-500' : completeness > 70 ? 'bg-accent' : 'bg-red-500'}`} 
                    style={{ width: `${completeness}%` }} 
                  />
                </div>
              </div>

              {/* Numeric Stats Grid */}
              {isNumeric && (
                <div className="grid grid-cols-2 gap-2 mt-2 bg-code-bg/50 p-2 rounded-lg border border-border/50">
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase tracking-wider">Min</span>
                    <span className="text-xs font-mono text-text truncate block">{col.min || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase tracking-wider">Max</span>
                    <span className="text-xs font-mono text-text truncate block">{col.max || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase tracking-wider">Mean</span>
                    <span className="text-xs font-mono text-text truncate block">{col.avg ? parseFloat(col.avg).toFixed(2) : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase tracking-wider">Std Dev</span>
                    <span className="text-xs font-mono text-text truncate block">{col.std ? parseFloat(col.std).toFixed(2) : 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
