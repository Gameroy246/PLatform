"use client";
import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, ScatterChart as ScatterChartIcon } from 'lucide-react';

interface DashboardProps {
  data: any[];
  columns: { name: string, type: string }[];
}

const COLORS = ['#aa3bff', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

export default function Dashboard({ data, columns }: DashboardProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'pie'>('bar');
  const [xAxis, setXAxis] = useState<string>(columns[0]?.name || '');
  const [yAxis, setYAxis] = useState<string>(columns.find(c => c.type.includes('INT') || c.type.includes('FLOAT') || c.type.includes('DOUBLE'))?.name || columns[1]?.name || '');

  const numericColumns = columns.filter(c => c.type.includes('INT') || c.type.includes('FLOAT') || c.type.includes('DOUBLE') || c.type.includes('DECIMAL') || c.type.includes('NUMERIC'));

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    if (chartType === 'pie') {
      const agg: Record<string, number> = {};
      data.forEach(row => {
        const key = String(row[xAxis] || 'Unknown');
        const val = Number(row[yAxis]) || 0;
        agg[key] = (agg[key] || 0) + val;
      });
      return Object.entries(agg).map(([name, value]) => ({ name, value })).slice(0, 20); // Limit to top 20 for pie
    }
    
    return data;
  }, [data, xAxis, yAxis, chartType]);

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        No data available to visualize. Run the pipeline first.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 bg-code-bg overflow-hidden gap-6">
      
      {/* Controls Header */}
      <div className="flex flex-wrap items-end gap-4 p-4 glass-panel rounded-xl shadow-shadow border border-border">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-h uppercase tracking-wider">Chart Type</label>
          <div className="flex bg-bg rounded-md p-1 border border-border">
            <button onClick={() => setChartType('bar')} className={`p-2 rounded flex items-center gap-2 text-sm transition-colors ${chartType === 'bar' ? 'bg-accent text-white' : 'text-text hover:bg-code-bg'}`}>
              <BarChartIcon className="w-4 h-4" /> Bar
            </button>
            <button onClick={() => setChartType('line')} className={`p-2 rounded flex items-center gap-2 text-sm transition-colors ${chartType === 'line' ? 'bg-accent text-white' : 'text-text hover:bg-code-bg'}`}>
              <LineChartIcon className="w-4 h-4" /> Line
            </button>
            <button onClick={() => setChartType('scatter')} className={`p-2 rounded flex items-center gap-2 text-sm transition-colors ${chartType === 'scatter' ? 'bg-accent text-white' : 'text-text hover:bg-code-bg'}`}>
              <ScatterChartIcon className="w-4 h-4" /> Scatter
            </button>
            <button onClick={() => setChartType('pie')} className={`p-2 rounded flex items-center gap-2 text-sm transition-colors ${chartType === 'pie' ? 'bg-accent text-white' : 'text-text hover:bg-code-bg'}`}>
              <PieChartIcon className="w-4 h-4" /> Pie
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-h uppercase tracking-wider">X-Axis (Dimension)</label>
          <select 
            value={xAxis} 
            onChange={(e) => setXAxis(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text-h focus:outline-none focus:border-accent h-[38px] min-w-[150px]"
          >
            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-h uppercase tracking-wider">Y-Axis (Measure)</label>
          <select 
            value={yAxis} 
            onChange={(e) => setYAxis(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-text-h focus:outline-none focus:border-accent h-[38px] min-w-[150px]"
          >
            {numericColumns.length > 0 ? numericColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>) : columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 bg-bg border border-border rounded-xl shadow-shadow p-6 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey={xAxis} tick={{ fill: 'var(--text-muted)' }} tickMargin={10} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-h)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yAxis} fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey={xAxis} tick={{ fill: 'var(--text-muted)' }} tickMargin={10} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-h)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey={yAxis} stroke="var(--accent)" strokeWidth={3} dot={{ fill: 'var(--bg)', strokeWidth: 2 }} activeDot={{ r: 8 }} />
            </LineChart>
          ) : chartType === 'scatter' ? (
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey={xAxis} type="category" allowDuplicatedCategory={false} tick={{ fill: 'var(--text-muted)' }} tickMargin={10} angle={-45} textAnchor="end" />
              <YAxis dataKey={yAxis} type="number" tick={{ fill: 'var(--text-muted)' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-h)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Scatter name={yAxis} data={processedData} fill="var(--accent)" />
            </ScatterChart>
          ) : (
            <PieChart>
              <Pie
                data={processedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="80%"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {processedData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-h)' }} />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

    </div>
  );
}

