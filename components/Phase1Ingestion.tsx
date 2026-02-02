import React, { useState, ChangeEvent } from 'react';
import { ContextType } from '../types';
import { Upload, FileText, Eye, X, MessageSquareText } from 'lucide-react';
import { useTaxonomyPromptTemplate } from '../services/apiHooks';

interface Props {
  onComplete: (data: string, context: ContextType, purpose?: string, customAnalystPrompt?: string) => void;
  isLoading: boolean;
}

const Phase1Ingestion: React.FC<Props> = ({ onComplete, isLoading }) => {
  const [text, setText] = useState<string>('');
  const [context, setContext] = useState<ContextType>(ContextType.INTERVIEW);
  const [purpose, setPurpose] = useState<string>('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptText, setPromptText] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [hasEditedPrompt, setHasEditedPrompt] = useState(false);

  const promptTemplateMutation = useTaxonomyPromptTemplate();

  const handleOpenPrompt = async () => {
    setShowPromptModal(true);
    if (!hasEditedPrompt) {
      setPromptLoading(true);
      try {
        const prompt = await promptTemplateMutation.mutateAsync(purpose || undefined);
        setPromptText(prompt);
      } catch {
        setPromptText('Could not load prompt template. Check that the server is running.');
      } finally {
        setPromptLoading(false);
      }
    }
  };

  const handleClosePrompt = () => {
    setShowPromptModal(false);
  };

  const handlePromptChange = (value: string) => {
    setPromptText(value);
    setHasEditedPrompt(true);
  };

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
      const customPrompt = hasEditedPrompt ? promptText : undefined;
      onComplete(text, context, purpose.trim() || undefined, customPrompt);
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

        {/* Customize codebook generation: purpose + prompt */}
        <div className="mb-6 p-4 rounded-xl border-2 border-brand-100 bg-brand-50/50">
          <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-brand-600" />
            Customize how themes are generated
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Optional: add your analysis purpose and review or edit the instructions sent to the AI so the codebook fits your research goals.
          </p>
          <label className="block text-sm font-medium text-slate-700 mb-2">Purpose of your analysis</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. understand barriers to adoption of the new tool"
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm mb-4 bg-white"
          />
          <button
            type="button"
            onClick={handleOpenPrompt}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 rounded-lg font-medium text-brand-700 bg-white border-2 border-brand-300 hover:border-brand-500 hover:bg-brand-50 transition-colors shadow-sm"
          >
            <Eye className="w-5 h-5" />
            View & edit analyst prompt
          </button>
          <p className="text-xs text-slate-500 mt-2">
            See the full instructions the AI uses to build your taxonomy; you can change wording or add rules.
          </p>
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

      <div className="flex flex-wrap items-center justify-end gap-3">
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

      {/* Modal: View / Edit analyst prompt */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Analyst prompt (used for taxonomy generation)</h3>
              <button
                type="button"
                onClick={handleClosePrompt}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-0">
              {promptLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <span className="animate-pulse">Loading prompt template...</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Edit the Role, Task, and Rules below. The system adds validity checks and your data when generating the taxonomy.
                  </p>
                  <textarea
                    value={promptText}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    className="flex-1 w-full p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono min-h-[320px] resize-y"
                    placeholder="Prompt will appear here..."
                    spellCheck={false}
                  />
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={handleClosePrompt}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Phase1Ingestion;
