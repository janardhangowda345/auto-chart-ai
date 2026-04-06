import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Download, Info, Maximize2, MoreHorizontal } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const ChartCard = ({ config, data, isLoading }) => {
  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-[300px] flex items-center justify-center bg-white/5 rounded-2xl animate-pulse">
          <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 bg-white/10 rounded-full"></div>
              <div className="h-2 w-24 bg-white/10 rounded-full"></div>
          </div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center bg-white/5 rounded-2xl border border-white/5">
          <p className="text-muted text-sm font-medium">No sufficient data for this visualization</p>
        </div>
      );
    }

    const { chart_type, x_column, y_column, color_column } = config;

    switch (chart_type) {
      case 'bar':
      case 'histogram':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
                dataKey={x_column} 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={{stroke: '#1f2937'}}
                tickLine={{stroke: '#1f2937'}}
            />
            <YAxis 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={{stroke: '#1f2937'}}
                tickLine={{stroke: '#1f2937'}}
                tickFormatter={(val) => Intl.NumberFormat('en', { notation: 'compact' }).format(val)}
            />
            <Tooltip />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
            <Bar dataKey={y_column} fill={chart_type === 'histogram' ? '#8b5cf6' : '#3b82f6'} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
                dataKey={x_column} 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={{stroke: '#1f2937'}}
                tickLine={{stroke: '#1f2937'}}
            />
            <YAxis 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={{stroke: '#1f2937'}}
                tickLine={{stroke: '#1f2937'}}
                tickFormatter={(val) => Intl.NumberFormat('en', { notation: 'compact' }).format(val)}
            />
            <Tooltip />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
            <Line type="monotone" dataKey={y_column} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }} />
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={y_column}
              nameKey={x_column}
              label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}} />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
                type="number" 
                dataKey={x_column} 
                name={x_column} 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={{stroke: '#1f2937'}}
                tickLine={{stroke: '#1f2937'}}
            />
            <YAxis 
                type="number" 
                dataKey={y_column} 
                name={y_column} 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={{stroke: '#1f2937'}}
                tickLine={{stroke: '#1f2937'}}
                tickFormatter={(val) => Intl.NumberFormat('en', { notation: 'compact' }).format(val)}
            />
            <ZAxis type="number" range={[64, 400]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
            <Scatter name={`${x_column} vs ${y_column}`} data={data} fill="#f59e0b" />
          </ScatterChart>
        );
        
      case 'heatmap':
        // Custom heatmap visualization
        return (
          <div className="h-full flex flex-col items-center justify-center p-4">
             <div className="grid grid-cols-[repeat(auto-fit,minmax(50px,1fr))] w-full gap-1">
                {data.map((d, i) => (
                    <div 
                        key={i} 
                        className="aspect-square flex items-center justify-center rounded-sm text-[8px] font-bold group relative"
                        style={{ background: `rgba(59, 130, 246, ${Math.abs(d.value)})` }}
                    >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-1 rounded absolute -top-4 z-10">{d.value}</span>
                    </div>
                ))}
             </div>
             <div className="mt-4 flex items-center justify-between w-full text-[10px] text-muted font-bold tracking-tighter px-2">
                <span>Correlation: 0.0</span>
                <div className="flex-1 mx-4 h-1.5 bg-gradient-to-r from-transparent via-primary to-primary rounded-full"></div>
                <span>1.0</span>
             </div>
          </div>
        );

      default:
        return <div className="flex items-center justify-center h-full">Unsupported {chart_type}</div>;
    }
  };

  return (
    <div className="bg-surface border border-white/5 rounded-3xl p-6 shadow-2xl transition-all duration-300 hover:border-primary/20 hover:shadow-primary/5 hover:translate-y-[-4px] overflow-hidden group">
      <header className="flex items-start justify-between mb-6">
        <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-md border border-primary/20">
                    {config.chart_type}
                </span>
                {config.aggregation !== 'none' && (
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest rounded-md border border-secondary/20">
                    {config.aggregation}
                  </span>
                )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight leading-tight group-hover:text-primary transition-colors">{config.title}</h3>
            <div className="flex items-center gap-2 text-muted italic">
                <Info size={12} className="shrink-0" />
                <p className="text-xs line-clamp-2">{config.reason}</p>
            </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 text-muted hover:text-white bg-white/5 rounded-lg transition-colors border border-white/5">
                <Download size={14} />
            </button>
            <button className="p-2 text-muted hover:text-white bg-white/5 rounded-lg transition-colors border border-white/5">
                <MoreHorizontal size={14} />
            </button>
        </div>
      </header>

      <div className="relative h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
        
        {!isLoading && data && data.length > 0 && (
             <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/10"></div>
             </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
