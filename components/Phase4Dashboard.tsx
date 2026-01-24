import React, { useState } from 'react';
import { AnalysisResult, Theme, CodedUnit } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Download, FileText, LayoutGrid, List } from 'lucide-react';

interface Props {
  results: AnalysisResult;
  themes: Theme[];
  isGeneratingNarrative: boolean;
  onGenerateNarrative: () => void;
}

const Phase4Dashboard: React.FC<Props> = ({ 
    results, themes, isGeneratingNarrative, onGenerateNarrative 
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // --- BEGIN EXPORT LOGIC ---
  const handleExportCSV = () => {
    // 1. Define the column titles
    const headers = ["Observation", "Primary Theme", "Sub-Theme", "Confidence"];
    
    // 2. Map your observations into rows for the spreadsheet
    const rows = results.codedUnits.map(unit => [
      `"${unit.text.replace(/"/g, '""')}"`, // This "cleans" the text so quotes don't break Excel
      getThemeName(unit.themeId),
      getSubThemeName(unit.themeId, unit.subThemeId),
      `${Math.round(unit.confidence * 100)}%`
    ]);

    // 3. Join everything with commas
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // 4. Create a virtual file and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "qualisight_research_results.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // --- END EXPORT LOGIC ---

  // Prepare chart data
  const chartData = themes.map((theme, index) => ({
    name: theme.name,
    count: results.themeCounts[theme.id] || 0,
    color: `hsl(${200 + (index * 30)}, 70%, 50%)`
  })).sort((a, b) => b.count - a.count);

  const getThemeName = (id: string) => themes.find(t => t.id === id)?.name || id;
  const getSubThemeName = (tid: string, sid: string) => 
    themes.find(t => t.id === tid)?.subThemes.find(s => s.id === sid)?.name || sid;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-slate-900">Analysis Dashboard</h2>
           <p className="text-slate-600">
             Processed {results.codedUnits.length} data units across {Object.keys(results.themeCounts).length} themes.
           </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium shadow-sm"
            >
                <Download className="w-4 h-4" /> Export CSV
            </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visuals */}
        <div className="lg:col-span-2 space-y-6">
            {/* Chart Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Theme Frequency</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={{fontSize: 12, fill: '#475569'}}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Narrative Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Research Narrative</h3>
                    <button 
                        onClick={onGenerateNarrative}
                        disabled={isGeneratingNarrative}
                        className="text-sm bg-brand-50 text-brand-700 px-3 py-1 rounded-md font-medium hover:bg-brand-100 disabled:opacity-50"
                    >
                        {isGeneratingNarrative ? 'Synthesizing...' : results.narrative ? 'Regenerate' : 'Generate Narrative'}
                    </button>
                </div>
                
                {results.narrative ? (
                    <div className="prose prose-slate prose-sm max-w-none">
                        {results.narrative.split('\n').map((para, i) => (
                            <p key={i} className="mb-2 text-slate-700 leading-relaxed">{para}</p>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                        <FileText className="w-8 h-8 mb-2 opacity-50" />
                        <p>Click "Generate Narrative" to synthesize findings.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Stats */}
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 rounded-xl shadow-md text-white">
                <h4 className="text-brand-100 text-sm font-medium uppercase tracking-wider mb-1">Total Observations</h4>
                <div className="text-4xl font-bold">{results.codedUnits.length}</div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Dominant Sub-Themes</h3>
                <div className="space-y-3">
                    {Object.entries(results.subThemeCounts)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([id, count], idx) => {
                            // Find parent theme for color
                            const parentTheme = themes.find(t => t.subThemes.some(s => s.id === id));
                            const subName = parentTheme?.subThemes.find(s => s.id === id)?.name || id;
                            
                            return (
                                <div key={id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="text-brand-600 font-bold text-sm w-4 text-center">{idx + 1}</div>
                                        <span className="text-slate-700 font-medium text-sm truncate max-w-[150px]" title={subName}>{subName}</span>
                                    </div>
                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{count}</span>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Coded Data Explorer</h3>
              <div className="flex gap-2">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-brand-600' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow text-brand-600' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
              </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {viewMode === 'table' ? (
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <tr>
                            <th className="p-3 border-b">Quote</th>
                            <th className="p-3 border-b w-48">Theme</th>
                            <th className="p-3 border-b w-48">Sub-Theme</th>
                            <th className="p-3 border-b w-24">Conf.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {results.codedUnits.map((unit) => (
                            <tr key={unit.id} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-700">{unit.text}</td>
                                <td className="p-3 text-slate-600 font-medium">{getThemeName(unit.themeId)}</td>
                                <td className="p-3 text-slate-500">{getSubThemeName(unit.themeId, unit.subThemeId)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${unit.confidence > 0.8 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {Math.round(unit.confidence * 100)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.codedUnits.map((unit) => (
                        <div key={unit.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                            <div className="mb-2 flex items-start justify-between">
                                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded uppercase tracking-wide">
                                    {getThemeName(unit.themeId)}
                                </span>
                                <span className="text-xs text-slate-400">{Math.round(unit.confidence * 100)}%</span>
                            </div>
                            <p className="text-sm text-slate-700 line-clamp-4 mb-3">"{unit.text}"</p>
                            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                                {getSubThemeName(unit.themeId, unit.subThemeId)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Phase4Dashboard;