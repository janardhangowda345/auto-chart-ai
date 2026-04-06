import React, { useState } from 'react';
import { 
    LayoutDashboard, Database, BarChart3, LineChart, 
    PieChart, ScatterChart, TableIcon, Menu, X, 
    Hash, Calendar, Type, ChevronRight, Upload, 
    LayoutGrid, List
} from 'lucide-react';
import ChartCard from './ChartCard';

const Dashboard = ({ fileInfo, chartConfigs, chartData, onReset }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const getTypeIcon = (type) => {
    switch (type) {
      case 'numeric': return <Hash size={14} className="text-primary" />;
      case 'datetime': return <Calendar size={14} className="text-secondary" />;
      default: return <Type size={14} className="text-muted" />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar Overlay for Mobile */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 left-6 z-50 p-4 bg-primary rounded-full shadow-2xl text-white lg:hidden"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-surface border-r border-white/5 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <LayoutDashboard size={20} />
              </div>
              <h1 className="font-black text-xl tracking-tighter uppercase">DataLens <span className="text-primary">AI</span></h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted"> <X size={20} /> </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {/* File Info */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted px-2">Dataset Info</h3>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3 shadow-inner">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-surface border border-white/10 rounded-xl text-primary">
                         <Database size={16} />
                    </div>
                  <p className="text-sm font-semibold truncate hover:text-primary transition-colors cursor-default" title={fileInfo?.filename}>{fileInfo?.filename}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-surface/50 rounded-xl text-center">
                        <p className="text-[10px] text-muted font-bold">ROWS</p>
                        <p className="text-sm font-black">{fileInfo?.row_count?.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-surface/50 rounded-xl text-center">
                        <p className="text-[10px] text-muted font-bold">COLS</p>
                        <p className="text-sm font-black">{fileInfo?.columns?.length}</p>
                    </div>
                </div>
              </div>
            </section>

            {/* Columns List */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Columns</h3>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5 text-muted">{fileInfo?.columns?.length}</span>
                </div>
              <div className="space-y-1">
                {fileInfo?.columns?.map(col => (
                  <div key={col} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all transition-duration-200 cursor-default">
                    <div className="p-1.5 bg-surface border border-white/10 rounded-lg group-hover:bg-primary/10 group-hover:border-primary/20 transition-all transition-duration-300">
                      {getTypeIcon(fileInfo.dtypes[col])}
                    </div>
                    <span className="text-xs font-medium text-muted grow truncate group-hover:text-white transition-colors capitalize">{col.replace(/_/g, ' ')}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight size={12} className="text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

             {/* Charts Navigation */}
             <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted px-2">Visualization Gallery</h3>
                <div className="space-y-1">
                {chartConfigs.map((config, index) => (
                    <a 
                        key={index} 
                        href={`#chart-${index}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl text-muted hover:text-white hover:bg-primary/5 transition-all text-xs font-semibold group"
                    >
                        <div className="bg-white/5 p-1.5 rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-all">
                             <BarChart3 size={14} />
                        </div>
                        <span className="truncate">{config.title}</span>
                    </a>
                ))}
                </div>
            </section>
          </div>

          {/* New Upload Button */}
          <div className="p-4 border-t border-white/5">
            <button 
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-surface hover:bg-surface/70 text-white rounded-2xl border border-white/10 hover:border-primary/30 transition-all font-bold group shadow-xl"
            >
              <Upload size={18} className="group-hover:scale-110 transition-transform text-primary" />
              <span className="text-sm">Upload New File</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/50 hero-grid">
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 glass border-b border-white/5">
            <div className="flex items-center gap-4">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary/20 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary/20 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        <List size={18} />
                    </button>
                </div>
                <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-white tracking-widest uppercase">Visual Intelligence Report</h2>
                    <p className="text-[10px] text-muted font-bold tracking-tight">POWERED BY CLAUDE 3.5 SONNET</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                 <div className="px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-full text-secondary text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></div>
                    Backend Ready
                 </div>
            </div>
        </header>

        <div className="p-8">
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            {chartConfigs.map((config, index) => (
              <div key={index} id={`#chart-${index}`} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
                <ChartCard 
                  config={config} 
                  data={chartData[index]} 
                  isLoading={!chartData[index]}
                />
              </div>
            ))}
          </div>
        </div>
        
        <footer className="p-12 text-center text-muted text-xs border-t border-white/5 mt-12 bg-surface/30 backdrop-blur-sm">
             <div className="flex items-center justify-center gap-6 mb-4 grayscale opacity-30">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Git-logo.svg" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" className="h-4" />
             </div>
             <p className="font-bold tracking-widest uppercase">© {new Date().getFullYear()} DataLens AI Lab. Advanced analytics engine.</p>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
