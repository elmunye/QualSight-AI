import { Theme, DataUnit, CodedUnit, SampleCorrection } from "../types";

// --- BRIDGE CONFIGURATION ---
// Detect if we are running locally (localhost or internal network IP)
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.');

// FIXED: Ensure we point to port 8080 AND include the '/api' prefix
export const BRIDGE_URL = isLocal 
  ? `http://${window.location.hostname}:8080/api` 
  : 'https://qualisight-v1-113045604803.us-central1.run.app/api';

/**
 * AGENT 1: The Ontologist (Pro Model)
 * Calls the bridge to generate the initial taxonomy.
 */
export const generateTaxonomy = async (
    rawText: string,
    contextType: string
): Promise<Theme[]> => {
    const response = await fetch(`${BRIDGE_URL}/generate-taxonomy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, contextType })
    });

    if (!response.ok) throw new Error('Bridge server error at generateTaxonomy');
    return response.json();
};

/**
 * UTILITY: Data Segmenter (AI-Powered)
 * Sends raw text to the bridge server for intelligent, context-aware segmentation.
 */
export const segmentData = async (rawText: string): Promise<DataUnit[]> => {
    const response = await fetch(`${BRIDGE_URL}/segment-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to segment data with AI');
    }

    return await response.json();
};

/**
 * AGENT 2: The Sampler (Flash Model)
 * Asks the bridge to provide initial coding for HITL verification.
 */
export const generateSampleCoding = async (
    units: DataUnit[],
    themes: Theme[],
    mode: 'quick' | 'comprehensive'
): Promise<CodedUnit[]> => {
    const response = await fetch(`${BRIDGE_URL}/generate-sample-coding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units, themes, mode })
    });

    if (!response.ok) throw new Error('Bridge server error at generateSampleCoding');
    return response.json();
};

/**
 * AGENT 3: The Bulk Processor (Flash Model)
 * Asks the bridge to code the remaining data units.
 */
export const performBulkAnalysis = async (
    units: DataUnit[],
    themes: Theme[],
    corrections: SampleCorrection[]
): Promise<CodedUnit[]> => {
    const response = await fetch(`${BRIDGE_URL}/bulk-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units, themes, corrections })
    });

    if (!response.ok) throw new Error('Bridge server error at performBulkAnalysis');
    return response.json();
};

/**
 * AGENT 4: The Reporter (Pro Model)
 * Asks the bridge to write the final narrative.
 */
export const generateNarrative = async (units: CodedUnit[], themes: Theme[]): Promise<string> => {
    const response = await fetch(`${BRIDGE_URL}/generate-narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ units, themes })
    });
    
    const data = await response.json();
    return data.text;
  };