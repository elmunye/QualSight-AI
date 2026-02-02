import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  SampleCorrection
} from './types';
import { 
  useSegmentData, 
  useGenerateTaxonomy, 
  useGenerateSampleCoding, 
  useBulkAnalysisJob
} from './services/apiHooks';
import { STEP_1_SEGMENTATION, STEP_2A_TAXONOMY_ANALYST, STEP_3A_SAMPLE_SELECTOR, STEP_3B_SAMPLE_CODER } from './constants/workflowSteps.js';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [phase, setPhase] = useState<AppPhase>(AppPhase.INGESTION);
  
  // Model state for sidebar display
  const [models] = useState({
    analystModel: "Gemini 2.5 Pro",
    criticModel: "Gemini 2.5 Flash"
  });
  const [loading, setLoading] = useState(false);
  const [totalUnits, setTotalUnits] = useState(0);

  // Data Store
  const [rawData, setRawData] = useState<string>('');
  const [dataContext, setDataContext] = useState<ContextType>(ContextType.INTERVIEW);
  const [dataUnits, setDataUnits] = useState<DataUnit[]>([]);
  
  const [themes, setThemes] = useState<Theme[]>([]);
  const [sampleUnits, setSampleUnits] = useState<CodedUnit[]>([]);
  
  const [jobId, setJobId] = useState<string | null>(null);
  
  const segmentMutation = useSegmentData();
  const taxonomyMutation = useGenerateTaxonomy();
  const sampleMutation = useGenerateSampleCoding();
  const bulkJobMutation = useBulkAnalysisJob();
  
  // --- Handlers ---

  const handleIngestionComplete = async (
    text: string,
    context: ContextType,
    purpose?: string,
    customAnalystPrompt?: string
  ) => {
    setLoading(true);
    try {
      setRawData(text);
      setDataContext(context);
      const taxonomyOptions =
        purpose !== undefined || customAnalystPrompt !== undefined
          ? { purpose, customAnalystPrompt }
          : undefined;

      // Parallel: Step 1 (Segmentation) + Steps 2a/2b/2c (Taxonomy)
      const [taxonomyResult, unitsResult] = await Promise.all([
        taxonomyMutation.mutateAsync({ text, context, options: taxonomyOptions }),
        segmentMutation.mutateAsync(text)
      ]);
      
      setThemes(taxonomyResult);
      setDataUnits(unitsResult);
      setPhase(AppPhase.TAXONOMY);
    } catch (e) {
      console.error(`${STEP_1_SEGMENTATION} / Taxonomy Error`, e);
      const msg = e instanceof Error ? e.message : "Error processing data. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTaxonomyApproval = async (approvedThemes: Theme[]) => {
    setThemes(approvedThemes);
    setPhase(AppPhase.SAMPLING_SELECTION);
  };

  const handleStartSampling = async (mode: 'quick' | 'comprehensive') => {
    setLoading(true);
    try {
      const samples = await sampleMutation.mutateAsync({ units: dataUnits, themes, mode });
      setSampleUnits(samples);
      setPhase(AppPhase.SAMPLING);
    } catch (e) {
      console.error(`${STEP_3B_SAMPLE_CODER} Error`, e);
      alert("Failed to generate samples.");
    } finally {
      setLoading(false);
    }
  };

  const handleSamplingComplete = async (
    corrections: SampleCorrection[],
    goldStandardUnits: { unitId: string; text: string; themeId: string; subThemeId: string }[]
  ) => {
    setLoading(true);
    setTotalUnits(dataUnits.length);

    try {
        const id = await bulkJobMutation.mutateAsync({ 
            units: dataUnits, 
            themes, 
            corrections, 
            goldStandardUnits 
        });
        setJobId(id);
        setPhase(AppPhase.ANALYSIS);
    } catch (e) {
      console.error("Bulk analysis (Steps 4a/4b/4c) Error", e);
      alert("Failed to start bulk analysis job.");
    } finally {
      setLoading(false);
    }
  };

// --- Render ---
if (showLanding) {
  return <LandingPage onStart={() => setShowLanding(false)} />;
}

return (
    <QueryClientProvider client={queryClient}>
      <Layout currentPhase={phase} models={models}>
      
      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center text-center">
          <div className="w-full max-w-md px-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-6"></div>
            
            {phase === AppPhase.INGESTION && (
              <p className="text-slate-500">{STEP_1_SEGMENTATION} & {STEP_2A_TAXONOMY_ANALYST}…</p>
            )}

            {phase === AppPhase.SAMPLING_SELECTION && (
              <p className="text-slate-500">{STEP_3A_SAMPLE_SELECTOR} & {STEP_3B_SAMPLE_CODER}…</p>
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

      {phase === AppPhase.ANALYSIS && (
        <Phase4Dashboard 
            jobId={jobId}
            themes={themes}
            totalUnits={totalUnits}
        />
      )}
      </Layout>
    </QueryClientProvider>
  );
  };

  export default App;
