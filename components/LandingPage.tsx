import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface LandingPageProps {
  onStart: () => void;
}
import { 
  Database, Layers, Target, BarChart2, ArrowRight, FileText, 
  Zap, ShieldCheck, TrendingUp, LayoutGrid, List,
  PlayCircle, Star, BookOpen, UserCheck, Cpu
} from 'lucide-react';

// --- MOCK DATA FOR THE TOOL PREVIEW ---
const MOCK_THEMES = [
  { id: 't1', name: 'User Autonomy', count: 12, color: '#0ea5e9' },
  { id: 't2', name: 'System Trust', count: 8, color: '#0284c7' },
  { id: 't3', name: 'Task Complexity', count: 5, color: '#0369a1' }
];

const MOCK_CODED_UNITS = [
  { id: 'u1', text: "The system provided a sense of control during the calibration phase.", theme: 'User Autonomy', confidence: 0.98 },
  { id: 'u2', text: "I felt hesitant to rely on the bulk analysis without seeing the reasoning.", theme: 'System Trust', confidence: 0.89 },
  { id: 'u3', text: "The taxonomy generation was surprisingly accurate for my field notes.", theme: 'User Autonomy', confidence: 0.95 }
];

// --- COMPONENT: DASHBOARD PREVIEW ---
const DashboardPreview = () => {
  const [viewMode, setViewMode] = useState('grid');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center font-black text-xs">Q</div>
          <span className="text-xs font-bold tracking-tight">QualiSight Research Workspace</span>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div className="text-[10px] text-slate-400 font-mono">LIVE_NODE_ACTIVE</div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 space-y-4 max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Thematic Volume</h3>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_THEMES} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fill: '#64748b'}} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                    {MOCK_THEMES.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Synthesis Intelligence</h3>
            <div className="space-y-2">
              <div className="h-2 bg-slate-100 rounded w-full"></div>
              <div className="h-2 bg-slate-100 rounded w-5/6"></div>
              <div className="h-2 bg-brand-50 rounded w-full"></div>
              <div className="h-2 bg-slate-50 rounded w-4/6"></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="text-[10px] italic text-slate-500">"Participants emphasized autonomy as a core requirement..."</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center px-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coded Observations</span>
            <div className="flex gap-1">
               <button onClick={() => setViewMode('grid')} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow text-brand-600' : 'text-slate-400'}`}><LayoutGrid size={12}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1 rounded ${viewMode === 'table' ? 'bg-white shadow text-brand-600' : 'text-slate-400'}`}><List size={12}/></button>
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              {MOCK_CODED_UNITS.map(u => (
                <div key={u.id} className="p-2 border border-slate-100 rounded flex justify-between items-start gap-4">
                  <p className="text-[10px] text-slate-600 italic">"{u.text}"</p>
                  <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded whitespace-nowrap uppercase">{u.theme}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN LANDING COMPONENT ---
export default function LandingPage({ onStart }: LandingPageProps) {
    const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Workspace Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-lg font-black shadow-lg shadow-brand-500/20">Q</div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">QualiSight <span className="text-brand-600 font-medium">Research</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <a href="#methodology" className="hover:text-brand-600 transition-colors">Methodology</a>
            <a href="#agents" className="hover:text-brand-600 transition-colors">AI Agents</a>
            <a href="#workflow" className="hover:text-brand-600 transition-colors">Workflow</a>
          </div>

            <button onClick={onStart} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 flex items-center gap-2">
                Enter Workspace <ArrowRight size={16} />
            </button>
        </div>
      </nav>

      {/* Hero: The Statement */}
      <header className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest">
                <BookOpen className="w-3 h-3 text-brand-400" /> Collaborative Analysis Environment
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
                Enhance Your <br />
                <span className="text-brand-600 italic">Qualitative Synthesis.</span>
              </h1>
              <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
                QualiSight is a specialized workspace designed for researchers. It assists in the transition from raw transcripts to structured insights through a systematic, human-in-the-loop agentic framework.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={onStart} className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-brand-500/25 transition-all active:scale-95">
                    Start Your Analysis
                </button>
                <button 
                  onClick={() => setShowDemo(!showDemo)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                >
                  <PlayCircle className="w-5 h-5 text-brand-600" /> {showDemo ? "Close Preview" : "See Workspace"}
                </button>
              </div>
              <div className="pt-4 flex items-center gap-6 grayscale opacity-50 overflow-hidden">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Powered by Gemini 2.5 Pro</span>
                <div className="h-px bg-slate-200 flex-grow"></div>
              </div>
            </div>

            <div className="relative">
              {showDemo ? (
                <div className="animate-in fade-in zoom-in duration-500">
                  <DashboardPreview />
                </div>
              ) : (
                <div className="relative group">
                   <div className="absolute -inset-4 bg-gradient-to-br from-brand-400 to-blue-600 rounded-3xl opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
                   <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-brand-600"><Cpu /></div>
                        <div>
                          <div className="text-xs font-black text-slate-400 uppercase mb-1">Current Task</div>
                          <div className="text-slate-900 font-bold">Discovering Emerging Themes...</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-2 bg-slate-100 rounded w-full"></div>
                        <div className="h-2 bg-slate-100 rounded w-5/6"></div>
                        <div className="h-2 bg-brand-500/20 rounded w-4/6"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="px-2 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold rounded uppercase">In-Context Logic</div>
                        <div className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded uppercase">Zero-Bias Coding</div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Agents: The Roles */}
      <section id="agents" className="py-24 bg-white border-y border-slate-200 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="lg:w-1/3">
              <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">An Agentic Research <br/>Framework</h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                QualiSight utilizes specialized AI agents that act as collaborative assistants, each focused on a distinct stage of the qualitative methodology.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-600" /> Human-in-the-loop
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The AI never makes final thematic decisions. It proposes, organizes, and calculates confidence—but the researcher calibrates and approves the final output.
                </p>
              </div>
            </div>

            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: Layers,
                  title: "The Ontologist",
                  desc: "Analyzes raw transcripts to identify semantic patterns and proposes a structured taxonomy of themes and sub-themes.",
                  role: "Systematic Structure"
                },
                {
                  icon: Target,
                  title: "The Sampler",
                  desc: "Selects representative data units for expert review, allowing the researcher to calibrate the coding logic.",
                  role: "Logic Alignment"
                },
                {
                  icon: Zap,
                  title: "The Bulk Coder",
                  desc: "Applies the researcher-approved logic across thousands of observations with consistent sentence-level granularity.",
                  role: "Scale & Precision"
                },
                {
                  icon: FileText,
                  title: "The Reporter",
                  desc: "Synthesizes final results into professional narratives, highlighting surprises and primary research takeaways.",
                  role: "Synthesized Output"
                }
              ].map((agent, i) => (
                <div key={i} className="p-6 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-slate-50/50 transition-all">
                  <div className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <agent.icon className="w-4 h-4" /> {agent.role}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{agent.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Methodology Section */}
      <section id="methodology" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">The Systematic Workflow</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Follow a structured process that ensures findings are grounded in the data and calibrated by your expertise.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2"></div>
            
            {[
              { 
                phase: "Phase 01", 
                title: "Data Ingestion", 
                text: "Raw transcripts and field notes are intelligently segmented into discrete data units while preserving citation integrity.",
                align: "left"
              },
              { 
                phase: "Phase 02", 
                title: "Taxonomy Generation", 
                text: "Our Ontologist agent proposes a research framework which you refine, add to, or restructure to match your project goals.",
                align: "right"
              },
              { 
                phase: "Phase 03", 
                title: "Sampling & Calibration", 
                text: "Review AI suggestions for key samples. This 'Human-in-the-loop' step ensures the AI understands your specific coding nuances.",
                align: "left"
              },
              { 
                phase: "Phase 04", 
                title: "Analysis & Synthesis", 
                text: "The final analysis is performed across the full dataset, followed by automated narrative reporting and data visualization.",
                align: "right"
              }
            ].map((step, i) => (
              <div key={i} className={`flex flex-col lg:flex-row gap-8 mb-16 items-center ${step.align === 'right' ? 'lg:flex-row-reverse' : ''}`}>
                <div className={`lg:w-1/2 ${step.align === 'left' ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className="inline-block text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded mb-2 tracking-widest">{step.phase}</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto lg:mx-0">{step.text}</p>
                </div>
                <div className="z-10 w-4 h-4 rounded-full bg-slate-900 border-4 border-slate-50 shadow-[0_0_0_10px_white]"></div>
                <div className="lg:w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Methodology Footer */}
      <section className="py-24 px-6 bg-slate-900 text-white rounded-t-[4rem]">
        <div className="max-w-4xl mx-auto text-center">
          <ShieldCheck className="w-16 h-16 text-brand-400 mx-auto mb-8 opacity-50" />
          <h2 className="text-4xl font-black mb-6 tracking-tight">Grounded in Research Integrity</h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            QualiSight is built to enhance the researcher's capabilities, not replace them. Every analysis remains transparent, auditable, and firmly under your direction.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={onStart} className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-brand-500/20 transition-all active:scale-95">
                 Enter Workspace
            </button>
          </div>
          <div className="mt-20 pt-12 border-t border-slate-800 text-slate-500 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="text-xs font-black uppercase tracking-[0.3em]">QualiSight &copy; 2026</div>
             <div className="flex gap-12 text-[10px] font-bold uppercase tracking-widest">
                <span className="hover:text-brand-400 cursor-pointer transition-colors">Methodology Paper</span>
                <span className="hover:text-brand-400 cursor-pointer transition-colors">Agentic Frameworks</span>
                <span className="hover:text-brand-400 cursor-pointer transition-colors">Contact Researcher</span>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}