import React, { useState } from 'react';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import Phase1Ingestion from './components/Phase1Ingestion';
import Phase2Taxonomy from './components/Phase2Taxonomy';
import Phase3Sampling from './components/Phase3Sampling';
import Phase4Dashboard from './components/Phase4Dashboard';
import { 
  AppPhase, 
  ContextType, 
  Theme, 
  DataUnit, 
  CodedUnit, 
  SampleCorrection,
  AnalysisResult 
} from './types';
import { 
  generateTaxonomy, 
  segmentData, 
  generateSampleCoding, 
  performBulkAnalysis,
  generateNarrative
} from './services/geminiService';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [phase, setPhase] = useState<AppPhase>(AppPhase.INGESTION);
  
  // Model state for sidebar display
  const [models] = useState({
    analystModel: "Gemini 1.5 Pro",
    criticModel: "Gemini 1.5 Flash"
  });
  const [loading, setLoading] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);

  // Data Store
  const [rawData, setRawData] = useState<string>('');
  const [dataContext, setDataContext] = useState<ContextType>(ContextType.INTERVIEW);
  const [dataUnits, setDataUnits] = useState<DataUnit[]>([]);
  
  const [themes, setThemes] = useState<Theme[]>([]);
  const [sampleUnits, setSampleUnits] = useState<CodedUnit[]>([]);
  const [sampleCorrections, setSampleCorrections] = useState<SampleCorrection[]>([]);
  
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);

  // --- Handlers ---

  const handleIngestionComplete = async (text: string, context: ContextType) => {
    setLoading(true);
    try {
      setRawData(text);
      setDataContext(context);
      
      // Parallel execution: Segment data AND Generate Taxonomy
      const [taxonomy, units] = await Promise.all([
        generateTaxonomy(text, context),
        segmentData(text)
      ]);
      
      setThemes(taxonomy);
      setDataUnits(units);
      setPhase(AppPhase.TAXONOMY);
    } catch (e) {
      console.error("Ingestion Error", e);
      alert("Error processing data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTaxonomyApproval = async (approvedThemes: Theme[]) => {
    setThemes(approvedThemes);
    // NEW: Open the selection screen instead of jumping to sampling
    setPhase(AppPhase.SAMPLING_SELECTION); 
  };

  // NEW: Add this function below handleTaxonomyApproval
  const handleStartSampling = async (mode: 'quick' | 'comprehensive') => {
    setLoading(true);
    try {
      const samples = await generateSampleCoding(dataUnits, themes, mode);
      setSampleUnits(samples);
      setPhase(AppPhase.SAMPLING);
    } catch (e) {
      console.error("Sampling Error", e);
      alert("Failed to generate samples.");
    } finally {
      setLoading(false);
    }
  };

  const handleSamplingComplete = async (corrections: SampleCorrection[]) => {
    setLoading(true);
    setProgress(0);
    setTotalUnits(dataUnits.length);

    let allCodedResults: CodedUnit[] = [];
    const batchSize = 10;

    try {
      for (let i = 0; i < dataUnits.length; i += batchSize) {
        const batch = dataUnits.slice(i, i + batchSize);
        
        // 1. Get the results from the server
        const batchResults = await performBulkAnalysis(batch, themes, corrections);
        
        // 2. EXTRA SAFETY: Double-check the text is attached before saving
        const verifiedBatch = batchResults.map(result => {
          const original = batch.find(u => String(u.id) === String(result.unitId));
          return {
            ...result,
            text: original ? original.text : result.text // Keep the original text if found
          };
        });

        allCodedResults = [...allCodedResults, ...verifiedBatch];
        setProgress(Math.min(i + batchSize, dataUnits.length));
      }

      // Calculate the chart numbers
      const themeCounts: Record<string, number> = {};
      const subThemeCounts: Record<string, number> = {};
      
      allCodedResults.forEach(u => {
        themeCounts[u.themeId] = (themeCounts[u.themeId] || 0) + 1;
        subThemeCounts[u.subThemeId] = (subThemeCounts[u.subThemeId] || 0) + 1;
      });

      setAnalysisResults({
        codedUnits: allCodedResults,
        narrative: '',
        themeCounts,
        subThemeCounts
      });
      
      setPhase(AppPhase.ANALYSIS);
    } catch (e) {
      console.error("Analysis Error", e);
      alert("Failed to perform bulk analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNarrative = async () => {
    if (!analysisResults) return;
    setNarrativeLoading(true);
    try {
      const narrative = await generateNarrative(analysisResults.codedUnits, themes);
      setAnalysisResults({ ...analysisResults, narrative });
    } catch (e) {
      console.error("Narrative Error", e);
    } finally {
      setNarrativeLoading(false);
    }
  };

// --- Render ---
if (showLanding) {
  return <LandingPage onStart={() => setShowLanding(false)} />;
}

return (
  <Layout currentPhase={phase} models={models}>
      
      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center text-center">
          <div className="w-full max-w-md px-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-6"></div>
            
            {phase === AppPhase.INGESTION && (
              <p className="text-slate-500">Segmenting data and proposing themes...</p>
            )}

            {/* If we are loading while in Taxonomy phase, it means we are fetching the samples */}
            {phase === AppPhase.SAMPLING_SELECTION && (
              <p className="text-slate-500">Scanning dataset for "Coded Units with Lowest Confidence Scores"...</p>
            )}

            {phase === AppPhase.SAMPLING && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Full Dataset</h3>
                <p className="text-slate-500 mb-8">Applying your logic to every unit...</p>

                <div className="w-full bg-slate-200 rounded-full h-3 mb-3 overflow-hidden">
                  <div 
                    className="bg-brand-600 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${totalUnits > 0 ? (progress / totalUnits) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  {progress} / {totalUnits} units
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main App Content - Switched by Phase */}
      {phase === AppPhase.INGESTION && (
        <Phase1Ingestion onComplete={handleIngestionComplete} isLoading={loading} />
      )}

      {phase === AppPhase.TAXONOMY && (
        <Phase2Taxonomy initialTaxonomy={themes} onApprove={handleTaxonomyApproval} />
      )}

      {/* TASK 2: NEW STRATEGY SELECTION SCREEN */}
      {phase === AppPhase.SAMPLING_SELECTION && (
        <div className="p-12 max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Calibration Strategy</h2>
          <p className="text-slate-500 mb-10">Select how we should identify samples for your review.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              onClick={() => handleStartSampling('quick')}
              className="p-8 border-2 border-slate-100 rounded-2xl hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left group"
            >
              <div className="text-3xl mb-4">⚡</div>
              <div className="font-bold text-xl text-slate-900 group-hover:text-brand-600">Quick Mode</div>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                8 random units. Fastest for a quick check of the initial taxonomy and general AI performance.
              </p>
            </button>

            <button 
              onClick={() => handleStartSampling('comprehensive')}
              className="p-8 border-2 border-slate-100 rounded-2xl hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left group"
            >
              <div className="text-3xl mb-4">🔬</div>
              <div className="font-bold text-xl text-slate-900 group-hover:text-brand-600">Grid-Hunter</div>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Intelligently picks <b>lowest-confidence</b> units for every theme/sub-theme combo using logprob math.
              </p>
            </button>
          </div>
        </div>
      )}

      {phase === AppPhase.SAMPLING && (
        <Phase3Sampling 
            sampleUnits={sampleUnits} 
            taxonomy={themes} 
            onComplete={handleSamplingComplete} 
        />
      )}

      {phase === AppPhase.ANALYSIS && analysisResults && (
        <Phase4Dashboard 
            results={analysisResults} 
            themes={themes}
            isGeneratingNarrative={narrativeLoading}
            onGenerateNarrative={handleGenerateNarrative}
        />
      )}
    </Layout>
  );
  };

  export default App;
