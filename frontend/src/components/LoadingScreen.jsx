import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

const LoadingScreen = ({ fileInfo }) => {
  const [step, setStep] = useState(1);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(2), 1500);
    const timer2 = setTimeout(() => setStep(3), 3500);
    const timer3 = setTimeout(() => setComplete(true), 5500);
    
    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
    };
  }, []);

  const steps = [
    { title: 'Parsing file', desc: 'Reading raw data and structure' },
    { title: 'Detecting patterns', desc: 'Analyzing column types and correlations' },
    { title: 'Generating visualizations', desc: 'Applying AI-powered chart recommendations' }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
      <div className="w-full max-w-md space-y-12 text-center animate-fade-up">
        <header className="space-y-4">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-surface rounded-full p-8 p-12 border border-white/5 glow shadow-2xl">
                    {complete ? (
                        <CheckCircle2 size={64} className="text-secondary animate-bounce" />
                    ) : (
                        <div className="relative">
                            <Loader2 size={64} className="text-primary animate-spin" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-xs">
                                AI
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white uppercase tracking-tighter">
                   DataLens <span className="text-primary">Intelligence</span>
                </h2>
                <p className="text-muted text-sm font-medium">Processing {fileInfo?.filename}</p>
            </div>
        </header>

        <div className="space-y-6">
          {steps.map((s, i) => (
            <div 
                key={i} 
                className={`flex items-start gap-4 p-4 rounded-2xl transition-all duration-500 border
                    ${step > i + 1 || (step === i + 1 && complete) 
                        ? 'bg-secondary/5 border-secondary/20 shadow-lg shadow-secondary/5' 
                        : step === i + 1 
                            ? 'bg-primary/5 border-primary/20 animate-pulse-slow' 
                            : 'bg-white/5 border-transparent opacity-40'}`}
            >
              <div className="pt-1">
                {step > i + 1 || (step === i + 1 && complete) ? (
                  <CheckCircle2 size={24} className="text-secondary" />
                ) : step === i + 1 ? (
                  <Loader2 size={24} className="text-primary animate-spin" />
                ) : (
                  <Circle size={24} className="text-muted" />
                )}
              </div>
              <div className="text-left">
                <p className={`font-bold transition-colors ${step >= i + 1 ? 'text-white' : 'text-muted'}`}>
                  {s.title}
                </p>
                <p className="text-xs text-muted/80">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {fileInfo && (
            <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Rows</p>
                    <p className="text-2xl font-black text-white">{fileInfo.row_count?.toLocaleString()}</p>
                </div>
                <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Columns</p>
                    <p className="text-2xl font-black text-white">{fileInfo.columns?.length}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
