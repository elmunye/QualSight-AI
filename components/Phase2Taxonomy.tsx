import React, { useState, useRef, useEffect } from 'react';
import { Theme, SubTheme } from '../types';
import { Plus, Trash2, CheckCircle, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

const AutoResizeTextarea = ({ value, onChange, className }: { value: string, onChange: (val: string) => void, className: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const node = textareaRef.current;
    if (node) {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    }
  };

  // This ensures the height is set immediately on load and on every window resize
  useEffect(() => {
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ overflow: 'hidden', resize: 'none' }}
    />
  );
};

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

  const updateSubTheme = (themeId: string, subId: string, updates: Partial<SubTheme>) => {
    setThemes(themes.map(t => {
      if (t.id !== themeId) return t;
      return {
        ...t,
        subThemes: t.subThemes.map(st => 
          st.id === subId ? { ...st, ...updates } : st
        )
      };
    }));
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
              className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-start justify-between cursor-pointer hover:bg-slate-100 transition-colors gap-4"
              onClick={() => toggleExpand(theme.id)}
            >
              {/* Left Section: Chevron and Theme Name */}
              <div className="flex items-start gap-3 w-full sm:flex-grow min-w-0">
                <div className="mt-1 flex-shrink-0">
                    {expandedTheme === theme.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </div>
                
                <div className="font-semibold text-slate-800 text-lg flex-grow min-w-0">
                  <AutoResizeTextarea 
                      value={theme.name}
                      onChange={(val) => updateThemeName(theme.id, val)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none px-1 w-full leading-snug py-0 block"
                  />
                </div>
              </div>

              {/* Right Section: Badge and Actions (Stacks below on very small screens) */}
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto flex-shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {(theme.subThemes || []).length} sub-themes
                </span>
                <button 
                    onClick={(e) => { e.stopPropagation(); deleteTheme(theme.id); }}
                    className="text-slate-300 hover:text-red-500 p-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </div>

            {expandedTheme === theme.id && (
              <div className="p-4 border-t border-slate-100">
                <div className="space-y-3">
                  {theme.subThemes.map((sub) => (
                    <div key={sub.id} className="flex items-start gap-3 group p-2 rounded hover:bg-slate-50">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0"></div>
                      <div className="flex-grow space-y-1">
                        {/* Editable Sub-theme Name */}
                        <input 
                          value={sub.name}
                          onChange={(e) => updateSubTheme(theme.id, sub.id, { name: e.target.value })}
                          className="font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 focus:outline-none w-full py-0.5"
                        />
                        
                        {/* Editable Definition */}
                        <AutoResizeTextarea 
                          value={sub.description}
                          onChange={(val) => updateSubTheme(theme.id, sub.id, { description: val })}
                          className="text-[13px] text-slate-500 italic bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 focus:outline-none w-full block py-0.5"
                        />
                      </div>
                      <button 
                        onClick={() => deleteSubTheme(theme.id, sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      // Generate a unique ID for the new sub-theme
                      const newSubId = `sub-${Date.now()}`;
                      
                      // Map through existing themes to find the one being edited
                      setThemes(themes.map(t => {
                        if (t.id !== theme.id) return t;
                        
                        // Return the updated theme with the new sub-theme added to the list
                        return { 
                          ...t, 
                          subThemes: [
                            ...(t.subThemes || []), 
                            { 
                              id: newSubId, 
                              name: 'New Sub-theme', 
                              description: 'Enter a description to define this sub-theme for the AI.' 
                            }
                          ] 
                        };
                      }));
                    }}
                    className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1 mt-2 pl-2"
                  >
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
