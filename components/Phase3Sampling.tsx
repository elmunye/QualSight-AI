import React, { useState } from 'react';
import { Theme, CodedUnit, SampleCorrection } from '../types';
import { Check, AlertTriangle, ArrowRight, RefreshCcw } from 'lucide-react';

interface Props {
  sampleUnits: CodedUnit[];
  taxonomy: Theme[];
  onComplete: (corrections: SampleCorrection[]) => void;
}

const Phase3Sampling: React.FC<Props> = ({ sampleUnits, taxonomy, onComplete }) => {
  // Use local state to track edits to the proposed coding
  const [reviews, setReviews] = useState<CodedUnit[]>(sampleUnits);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [corrections, setCorrections] = useState<SampleCorrection[]>([]);

  const currentUnit = reviews[currentIndex];
  
  // Find current theme objects for dropdowns
  const currentTheme = taxonomy.find(t => t.id === currentUnit.themeId);
  const currentSubTheme = currentTheme?.subThemes.find(st => st.id === currentUnit.subThemeId);

  const handleThemeChange = (newThemeId: string) => {
    const defaultSub = taxonomy.find(t => t.id === newThemeId)?.subThemes[0]?.id || '';
    updateReview(newThemeId, defaultSub);
  };

  const updateReview = (themeId: string, subThemeId: string) => {
    const updated = [...reviews];
    updated[currentIndex] = {
      ...updated[currentIndex],
      themeId,
      subThemeId
    };
    setReviews(updated);
  };

  const handleConfirm = () => {
    // Check if changed
    const original = sampleUnits[currentIndex];
    const current = reviews[currentIndex];

    if (original.themeId !== current.themeId || original.subThemeId !== current.subThemeId) {
       setCorrections(prev => [...prev, {
         unitId: current.id,
         originalThemeId: original.themeId,
         originalSubThemeId: original.subThemeId,
         correctedThemeId: current.themeId,
         correctedSubThemeId: current.subThemeId
       }]);
    }

    if (currentIndex < reviews.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Done
      onComplete(corrections);
    }
  };

  const progress = ((currentIndex) / reviews.length) * 100;

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
       <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Smart Sampling & Calibration</h2>
          <p className="text-slate-600">Review AI suggestions to train the model on your specific interpretation.</p>
       </div>

       <div className="w-full bg-slate-200 h-2 rounded-full mb-8">
          <div 
            className="bg-brand-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
       </div>

       <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
             <span className="font-mono text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sample {currentIndex + 1} of {reviews.length}
             </span>
             {currentUnit.confidence < 0.7 && (
               <div className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded">
                 <AlertTriangle className="w-3 h-3" /> Low Confidence
               </div>
             )}
          </div>

          <div className="p-8">
             <blockquote className="text-xl text-slate-800 font-medium leading-relaxed mb-8 border-l-4 border-brand-200 pl-4">
               "{currentUnit.text}"
             </blockquote>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Theme</label>
                   <select 
                     value={currentUnit.themeId}
                     onChange={(e) => handleThemeChange(e.target.value)}
                     className="w-full p-2.5 rounded-md border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                   >
                      {taxonomy.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Sub-Theme</label>
                   <select 
                     value={currentUnit.subThemeId}
                     onChange={(e) => updateReview(currentUnit.themeId, e.target.value)}
                     className="w-full p-2.5 rounded-md border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                   >
                      {currentTheme?.subThemes.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                   </select>
                </div>
             </div>

             <div className="mt-4 text-sm text-slate-500">
                <span className="font-semibold">AI Rationale:</span> {currentUnit.rationale}
             </div>
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
             <button
               onClick={handleConfirm}
               className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium shadow-md shadow-brand-500/20 flex items-center gap-2 transition-transform active:scale-95"
             >
               {currentIndex === reviews.length - 1 ? "Finish Calibration" : "Confirm & Next"} <ArrowRight className="w-4 h-4" />
             </button>
          </div>
       </div>

       <div className="mt-6 text-center text-sm text-slate-400">
          <span className="flex items-center justify-center gap-1">
             <RefreshCcw className="w-3 h-3" /> The AI learns from every correction you make.
          </span>
       </div>
    </div>
  );
};

export default Phase3Sampling;
