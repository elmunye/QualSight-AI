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
  PlayCircle, Star, BookOpen, UserCheck, Cpu, Scissors // Add Scissors here
} from 'lucide-react';

// --- MOCK DATA FOR THE TOOL PREVIEW ---
const MOCK_THEMES = [
  { id: 't1', name: 'User Autonomy', count: 18, color: '#0ea5e9' }, // Blue
  { id: 't2', name: 'System Trust', count: 14, color: '#6366f1' },  // Indigo
  { id: 't3', name: 'Task Speed', count: 12, color: '#10b981' },    // Emerald
  { id: 't4', name: 'Data Integrity', count: 9, color: '#f43f5e' }, // Rose
  { id: 't5', name: 'Complexity', count: 6, color: '#f59e0b' }     // Amber
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
          <span className="text-xs font-bold tracking-tight">QualiSight Research Dashboard</span>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div className="text-[10px] text-slate-400 font-mono">LIVE_NODE_ACTIVE</div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 space-y-4 max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {/* Thematic Frequency Card */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3">Thematic Frequency</h3>
            <div className="flex-grow min-h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_THEMES} layout="vertical" margin={{ left: -20, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 8, fill: '#64748b', fontWeight: 600}} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={10}>
                    {MOCK_THEMES.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Executive Narrative Card (Agent 6) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase">Analysis & Narrative</h3>
              <span className="text-[7px] font-bold text-brand-600 bg-brand-50 px-1 py-0.5 rounded uppercase">Agent 6</span>
            </div>
            <div className="space-y-3 flex-grow">
              <div className="text-[10px] leading-relaxed text-slate-600">
                Primary analysis shows <span className="text-brand-600 font-bold bg-brand-50 px-1 rounded">User Autonomy</span> remains the dominant driver, correlated strongly with <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">System Trust</span>.
              </div>
              <div className="text-[10px] leading-relaxed text-slate-500 border-l-2 border-slate-100 pl-2 italic">
                "The system provided a sense of control during calibration..."
              </div>
              <div className="mt-auto pt-2 flex flex-col gap-2">
                <div className="flex gap-1">
                  <div className="h-1 bg-brand-500 rounded-full w-1/3"></div>
                  <div className="h-1 bg-indigo-400 rounded-full w-1/4"></div>
                  <div className="h-1 bg-emerald-400 rounded-full w-1/6"></div>
                  <div className="h-1 bg-slate-100 rounded-full w-1/12"></div>
                </div>
                <div className="text-[8px] font-medium text-slate-400 flex justify-between">
                  <span>Consensus: 98%</span>
                  <span className="text-brand-500">Verified by Auditor →</span>
                </div>
              </div>
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


// --- UPDATED: SIX-AGENT SIMULATION DATA ---
const SIMULATED_TASKS = [
  { 
    agent: "1. Semantic Segmenter", 
    task: "Parsing data into segments...", 
    status: "Verbatim Lock: Active",
    color: "bg-blue-500",
    bars: [100, 85, 40] 
  },
  { 
    agent: "2. The Ontologist", 
    task: "Creative discovery of latent patterns...", 
    status: "Inductive Discovery Mode",
    color: "bg-indigo-500",
    bars: [60, 95, 70] 
  },
  { 
    agent: "3. The Calibrator", 
    task: "Isolating uncertainty & edge cases...", 
    status: "Human Input Alignment",
    color: "bg-amber-500",
    bars: [30, 50, 90] 
  },
  { 
    agent: "4. The Bulk Coder", 
    task: "Applying codebook to full dataset...", 
    status: "Temp 0: Strict Adherence",
    color: "bg-cyan-500",
    bars: [100, 100, 100] 
  },
  { 
    agent: "5. The Critic", 
    task: "Adversarial QA & error detection...", 
    status: "Quality Assurance: Active",
    color: "bg-rose-500",
    bars: [20, 40, 30] 
  },
  { 
    agent: "6. Reporter", 
    task: "Synthesizing abstract narratives...", 
    status: "Synthesis Mode",
    color: "bg-emerald-500",
    bars: [80, 70, 95] 
  }
];

const DynamicProcessCard = () => {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    // Faster interval (2.5s) to account for more steps
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % SIMULATED_TASKS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const current = SIMULATED_TASKS[step];

  return (
    <div className="relative group transition-all duration-700">
      <div className={`absolute -inset-4 rounded-3xl opacity-10 blur-2xl transition-colors duration-1000 ${current.color}`}></div>
      <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-colors duration-1000 ${current.color}`}>
              <Cpu className="animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Active Agent</div>
              <div className="text-slate-900 font-bold transition-all">{current.agent}</div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400">0{step + 1} / 06</div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Current Operation</div>
            <div className="text-sm text-slate-600 italic">"{current.task}"</div>
          </div>
          <div className="space-y-2">
            {current.bars.map((w, i) => (
              <div key={i} className="h-1.5 bg-slate-100 rounded-full w-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-in-out ${current.color} opacity-30`} 
                  style={{ width: `${w}%` }}
                ></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <div className="px-2 py-1 bg-slate-900 text-white text-[9px] font-black rounded uppercase tracking-tighter">
            {current.status}
          </div>
          <div className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded uppercase">
            Agentic Node Live
          </div>
        </div>
      </div>
    </div>
  );
};


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
            <a href="#agents" className="hover:text-brand-600 transition-colors">Methodology</a>
            <a href="#methodology" className="hover:text-brand-600 transition-colors">Workflow</a>
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
                <BookOpen className="w-3 h-3 text-brand-400" /> Agentic Qualitative Research 
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
                Qualitative Coding <br />
                <span className="text-brand-600 italic">without the manual grind.</span>
              </h1>
              <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
                QualiSight is a tool designed for qualitative researchers. It assists in the transition from raw transcripts to coded data through a systematic, human-in-the-loop agentic AI framework.
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
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Powered by Gemini 2.5 Flash & Pro</span>
                <div className="h-px bg-slate-200 flex-grow"></div>
              </div>
            </div>

            <div className="relative">
              {showDemo ? (
                <div className="animate-in fade-in zoom-in duration-500">
                  <DashboardPreview />
                </div>
              ) : (
                <DynamicProcessCard />
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
              <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">An Agentic Qualitative <br/>Coding Framework</h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                QualiSight utilizes specialized AI agents that act as collaborative assistants, each focused on a distinct stage of the qualitative coding process.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-600" /> Human-in-the-loop
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The AI never makes final thematic decisions. It proposes, organizes, and calculates reliability scores—but the researcher calibrates and approves the final output.
                </p>
              </div>
            </div>

            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: Scissors,
                  title: "1. The Segmenter",
                  desc: "Transforms raw transcripts into discrete units while enforcing absolute structural integrity.",
                  role: "Structural Integrity",
                  isHuman: false
                },
                {
                  icon: Layers,
                  title: "2. The Ontologist",
                  desc: "Uses inductive logic to discover latent patterns and propose a high-density thematic taxonomy.",
                  role: "Creative Discovery",
                  isHuman: false
                },
                {
                  icon: UserCheck, // Changed icon to emphasize the human role
                  title: "3. The Calibrator",
                  desc: "The critical human-in-the-loop stage. You review sampled cases to align the AI's logic with your expert judgement.",
                  role: "Expert Alignment",
                  isHuman: true // Custom flag for styling
                },
                {
                  icon: Zap,
                  title: "4. The Bulk Coder",
                  desc: "Applies your approved codebook across the full dataset with machine-level consistency.",
                  role: "Scale & Precision",
                  isHuman: false
                },
                {
                  icon: ShieldCheck,
                  title: "5. The Auditor",
                  desc: "An adversarial QA agent that flags errors and provides a reliability score for your final review.",
                  role: "Quality Assurance",
                  isHuman: false
                },
                {
                  icon: FileText,
                  title: "6. The Reporter",
                  desc: "Synthesizes thousands of data units into executive narratives grounded in your verbatim evidence.",
                  role: "Coded Data",
                  isHuman: false
                }
              ].map((agent, i) => (
                <div 
                  key={i} 
                  className={`p-6 rounded-2xl border transition-all relative ${
                    agent.isHuman 
                      ? 'border-brand-500 bg-brand-50/30 shadow-lg shadow-brand-500/10 scale-105 z-10' 
                      : 'border-slate-100 hover:border-brand-200 hover:bg-slate-50/50'
                  }`}
                >
                  {agent.isHuman && (
                    <div className="absolute -top-3 left-6 bg-brand-600 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
                      Directed by a human expert
                    </div>
                  )}
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                    agent.isHuman ? 'text-brand-700' : 'text-brand-600'
                  }`}>
                    <agent.icon className="w-4 h-4" /> {agent.role}
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${agent.isHuman ? 'text-brand-900' : 'text-slate-900'}`}>
                    {agent.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${agent.isHuman ? 'text-brand-800 font-medium' : 'text-slate-500'}`}>
                    {agent.desc}
                  </p>
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
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">The 4-Step Workflow</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Follow a structured process that ensures findings are grounded in the data and calibrated by your expertise.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2"></div>
            
            {[
              { 
                phase: "Step 01", 
                title: "Semantic Segmentation", 
                text: "Raw transcripts are intelligently parsed into discrete data units. Our 'Verbatim Lock' ensures structural integrity, meaning citations and speaker labels are never orphaned.",
                align: "left"
              },
              { 
                phase: "Step 02", 
                title: "Inductive Taxonomy", 
                text: "The Ontologist agent builds a hierarchical framework with built-in Sparsity Guards, ensuring your themes are high-density and meaningful, not redundant.",
                align: "right"
              },
              { 
                phase: "Step 03", 
                title: "Few-Shot Calibration", 
                text: "Don't audit everything. We isolate coding cases where AI confidence is lowest for human calibration, ensuring the model aligns with your expert judgement.",
                align: "left"
              },
              { 
                phase: "Step 04", 
                title: "Coded Dataset", 
                text: "Coded data is peer-validated by an Auditor loop before the Reporter Agent generates an analysis of themes grounded in your verbatim data.",
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
          <h2 className="text-4xl font-black mb-6 tracking-tight">Grounded in 8+ Years of Research Experience</h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            QualiSight is built to enhance the researcher's capabilities, not replace them. From inductive taxonomy discovery to few-shot calibration, the AI handles the mechanical coding while you direct it.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={onStart} className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-brand-500/20 transition-all active:scale-95">
                 Enter Workspace
            </button>
          </div>
          <div className="mt-20 pt-12 border-t border-slate-800 text-slate-500 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="text-xs font-black uppercase tracking-[0.3em]">QualiSight &copy; 2026</div>
             <div className="flex gap-12 text-[10px] font-bold uppercase tracking-widest">
                <span className="hover:text-brand-400 cursor-pointer transition-colors"></span>
                <span className="hover:text-brand-400 cursor-pointer transition-colors"></span>
                <span className="hover:text-brand-400 cursor-pointer transition-colors"></span>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}