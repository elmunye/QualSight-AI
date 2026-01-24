import React, { useState, ChangeEvent } from 'react';
import { ContextType } from '../types';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onComplete: (data: string, context: ContextType) => void;
  isLoading: boolean;
}

const Phase1Ingestion: React.FC<Props> = ({ onComplete, isLoading }) => {
  const [text, setText] = useState<string>('');
  const [context, setContext] = useState<ContextType>(ContextType.INTERVIEW);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (text.trim().length > 10) {
      onComplete(text, context);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Ingestion & Setup</h2>
        <p className="text-slate-600">Upload your raw qualitative data to begin the analysis.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Data Context</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.values(ContextType).map((type) => (
            <button
              key={type}
              onClick={() => setContext(type)}
              className={`p-4 rounded-lg border text-left transition-all ${
                context === type
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="block font-medium">{type}</span>
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-2">Raw Data</label>
        
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 mb-4 text-center hover:bg-slate-50 transition-colors">
          <input
            type="file"
            accept=".txt,.csv,.md"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-10 h-10 text-slate-400 mb-2" />
            <span className="text-sm text-slate-600 font-medium">Click to upload text file</span>
            <span className="text-xs text-slate-400 mt-1">Supports .txt, .md, .csv</span>
          </label>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or paste your transcript text here..."
            className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono"
          />
          <div className="absolute top-2 right-2 text-xs text-slate-400 bg-white px-2 py-1 rounded">
            {text.length} chars
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={text.length < 10 || isLoading}
          className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Structure...
            </>
          ) : (
            <>
              Generate Taxonomy <FileText className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Phase1Ingestion;
