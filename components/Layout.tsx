import React from 'react';
import { AppPhase } from '../types';
import { Layers, Database, Target, BarChart2, CheckCircle2 } from 'lucide-react';

interface Props {
  currentPhase: AppPhase;
  children: React.ReactNode;
}

const steps = [
  { phase: AppPhase.INGESTION, label: 'Ingestion', icon: Database },
  { phase: AppPhase.TAXONOMY, label: 'Taxonomy', icon: Layers },
  { phase: AppPhase.SAMPLING, label: 'Calibration', icon: Target },
  { phase: AppPhase.ANALYSIS, label: 'Analysis', icon: BarChart2 },
];

const Layout: React.FC<Props> = ({ currentPhase, children }) => {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
           <h1 className="text-2xl font-extrabold text-brand-700 tracking-tight flex items-center gap-2">
             <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-lg">Q</div>
             QualiSight
           </h1>
           <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Research AI</p>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {steps.map((step) => {
             const isActive = currentPhase === step.phase;
             const isCompleted = currentPhase > step.phase;
             
             return (
               <div 
                 key={step.phase}
                 className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-brand-50 text-brand-700 font-semibold' 
                      : isCompleted
                        ? 'text-slate-600'
                        : 'text-slate-400'
                 }`}
               >
                 <div className="relative">
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <step.icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />}
                 </div>
                 <span>{step.label}</span>
               </div>
             )
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
           <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Status:</span> Connected
              <br/>
              <span className="font-semibold text-slate-700">Model:</span> Gemini 3.0 Flash
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="max-w-7xl mx-auto px-6 py-8">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
