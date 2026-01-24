import React, { useState } from 'react';
import { Theme, SubTheme } from '../types';
import { Plus, Trash2, CheckCircle, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  initialTaxonomy: Theme[];
  onApprove: (taxonomy: Theme[]) => void;
}

const Phase2Taxonomy: React.FC<Props> = ({ initialTaxonomy, onApprove }) => {
  const [themes, setThemes] = useState<Theme[]>(initialTaxonomy);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(initialTaxonomy[0]?.id || null);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedTheme(expandedTheme === id ? null : id);
  };

  const deleteTheme = (id: string) => {
    setThemes(themes.filter(t => t.id !== id));
  };

  const deleteSubTheme = (themeId: string, subId: string) => {
    setThemes(themes.map(t => {
      if (t.id !== themeId) return t;
      return { ...t, subThemes: t.subThemes.filter(st => st.id !== subId) };
    }));
  };

  const updateThemeName = (id: string, newName: string) => {
    setThemes(themes.map(t => t.id === id ? { ...t, name: newName } : t));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Review Taxonomy</h2>
          <p className="text-slate-600">Edit the AI-proposed themes to match your research framework.</p>
        </div>
        <button
          disabled={isProcessing}
          onClick={async () => {
            setIsProcessing(true);
            await onApprove(themes);
          }}
          className={`${
            isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'
          } text-white px-6 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating Samples...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" /> Approve & Start Sampling
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {themes.map((theme) => (
          <div key={theme.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => toggleExpand(theme.id)}
            >
              <div className="flex items-center gap-3">
                 {expandedTheme === theme.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                 <div className="font-semibold text-slate-800 text-lg">
                    <input 
                        value={theme.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateThemeName(theme.id, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none px-1"
                    />
                 </div>
                 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {(theme.subThemes || []).length} sub-themes
                 </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteTheme(theme.id); }}
                className="text-slate-400 hover:text-red-500 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {expandedTheme === theme.id && (
              <div className="p-4 border-t border-slate-100">
                <div className="space-y-3">
                  {theme.subThemes.map((sub) => (
                    <div key={sub.id} className="flex items-start gap-3 group p-2 rounded hover:bg-slate-50">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0"></div>
                      <div className="flex-grow">
                        <div className="font-medium text-slate-800">{sub.name}</div>
                        <div className="text-sm text-slate-500">{sub.description}</div>
                      </div>
                      <button 
                        onClick={() => deleteSubTheme(theme.id, sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1 mt-2 pl-2">
                    <Plus className="w-3 h-3" /> Add Sub-theme
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
        onClick={() => {
            const newId = `theme-${Date.now()}`;
            setThemes([...themes, { id: newId, name: 'New Theme', subThemes: [] }]);
            setExpandedTheme(newId);
        }}
      >
        <Plus className="w-5 h-5" /> Add New Theme Category
      </button>
    </div>
  );
};

export default Phase2Taxonomy;
