import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  segmentData, 
  generateTaxonomy, 
  generateSampleCoding, 
  performBulkAnalysis, 
  generateNarrative,
  fetchTaxonomyPromptTemplate,
  BRIDGE_URL 
} from './geminiService';
import { Theme, DataUnit, CodedUnit, SampleCorrection, GoldStandardUnit } from '../types';

export const useSegmentData = () => {
  return useMutation({
    mutationFn: (text: string) => segmentData(text)
  });
};

export const useGenerateTaxonomy = () => {
  return useMutation({
    mutationFn: (variables: { text: string, context: string, options?: any }) => 
      generateTaxonomy(variables.text, variables.context, variables.options)
  });
};

export const useGenerateSampleCoding = () => {
  return useMutation({
    mutationFn: (variables: { units: DataUnit[], themes: Theme[], mode: 'quick' | 'comprehensive' }) =>
      generateSampleCoding(variables.units, variables.themes, variables.mode)
  });
};

// Poll for job status
const fetchJobStatus = async (jobId: string) => {
  const response = await fetch(`${BRIDGE_URL}/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch job status');
  }
  return response.json();
};

export const useBulkAnalysisJob = () => {
  return useMutation({
    mutationFn: async (variables: { 
      units: DataUnit[], 
      themes: Theme[], 
      corrections: SampleCorrection[], 
      goldStandardUnits?: GoldStandardUnit[] 
    }) => {
      // Start the job
      const response = await fetch(`${BRIDGE_URL}/bulk-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables)
      });
      
      if (!response.ok) {
        throw new Error('Failed to start bulk analysis job');
      }
      
      const { jobId } = await response.json();
      return jobId;
    }
  });
};

export const useJobStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: ['jobStatus', jobId],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
        // @ts-ignore
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    }
  });
};

export const useGenerateNarrative = () => {
  return useMutation({
    mutationFn: (variables: { units: CodedUnit[], themes: Theme[] }) =>
      generateNarrative(variables.units, variables.themes)
  });
};

export const useTaxonomyPromptTemplate = () => {
  return useMutation({
    mutationFn: (purpose?: string) => fetchTaxonomyPromptTemplate(purpose)
  });
};
