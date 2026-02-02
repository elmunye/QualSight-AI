import { Theme, DataUnit, CodedUnit, SampleCorrection } from "../types";
import { STEP_1_SEGMENTATION, ROUTE_2_GENERATE_TAXONOMY, ROUTE_3_GENERATE_SAMPLE_CODING, ROUTE_4_BULK_ANALYSIS, STEP_5_NARRATIVE } from "../constants/workflowSteps.js";

// --- BRIDGE CONFIGURATION ---
// In local dev (Vite): use same origin so /api is proxied to backend (see vite.config proxy).
// When opening built app on 8080: same origin. When deployed: use production API.
const isLocal = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.');

export const BRIDGE_URL = isLocal
  ? `${window.location.origin}/api`
  : 'https://qualisight-v1-113045604803.us-central1.run.app/api';

/**
 * Fetch the analyst prompt template for display/edit (purpose substituted, {{DATA}} as placeholder).
 * Used before Step 2a (Taxonomy Analyst).
 */
export const fetchTaxonomyPromptTemplate = async (purpose?: string): Promise<string> => {
    const url = purpose != null && purpose.trim() !== ''
        ? `${BRIDGE_URL}/taxonomy-prompt?purpose=${encodeURIComponent(purpose.trim())}`
        : `${BRIDGE_URL}/taxonomy-prompt`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load prompt template');
    const data = await response.json();
    return data.prompt ?? '';
};

/**
 * Steps 2a, 2b, 2c – Taxonomy (Analyst → Critic → Finalizer).
 * Calls the bridge /api/generate-taxonomy; server runs Pro for 2a/2b/2c.
 */
export const generateTaxonomy = async (
    rawText: string,
    contextType: string,
    options?: { purpose?: string; customAnalystPrompt?: string }
): Promise<Theme[]> => {
    const body: Record<string, unknown> = { rawText, contextType };
    if (options?.purpose !== undefined) body.purpose = options.purpose;
    if (options?.customAnalystPrompt !== undefined) body.customAnalystPrompt = options.customAnalystPrompt;

    const response = await fetch(`${BRIDGE_URL}/generate-taxonomy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        let msg = (data && typeof data.error === 'string') ? data.error : `Server error (${response.status})`;
        if (response.status === 502 || response.status === 0) {
            msg = 'Backend not reachable. Start the server: in a separate terminal run "npm start" and keep it running, then try again.';
        }
        throw new Error(msg);
    }
    return data;
};

/**
 * Step 1 – Segmentation. Agent: Pro (Segmenter).
 * Sends raw text to /api/segment-data for unitizing.
 */
export const segmentData = async (rawText: string): Promise<DataUnit[]> => {
    const response = await fetch(`${BRIDGE_URL}/segment-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        let msg = (data && typeof data.error === 'string') ? data.error : `Failed at ${STEP_1_SEGMENTATION}.`;
        if (response.status === 502 || response.status === 0) {
            msg = 'Backend not reachable. Start the server: in a separate terminal run "npm start" and keep it running, then try again.';
        }
        throw new Error(msg);
    }
    return data;
};

/**
 * Steps 3a, 3b – Sample coding (HITL). 3a: Pro (Sample Selector, comprehensive only). 3b: Flash (Sample Coder).
 * Calls /api/generate-sample-coding.
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

    if (!response.ok) throw new Error(`Bridge server error at ${ROUTE_3_GENERATE_SAMPLE_CODING}`);
    return response.json();
};

/** Gold standard unit for few-shot in bulk analyst (user-validated sample from Step 3). */
export interface GoldStandardUnit {
  unitId?: string;
  id?: string;
  text: string;
  themeId: string;
  subThemeId: string;
}

/**
 * Steps 4a, 4b, 4c – Bulk analysis (Flash Analyst → Flash Critic → Server Synthesis).
 * Calls /api/bulk-analysis per batch. goldStandardUnits = user-validated sample codings for few-shot.
 */
export const performBulkAnalysis = async (
    units: DataUnit[],
    themes: Theme[],
    corrections: SampleCorrection[],
    goldStandardUnits?: GoldStandardUnit[]
): Promise<CodedUnit[]> => {
    const body: Record<string, unknown> = { units, themes, corrections };
    if (goldStandardUnits != null) body.goldStandardUnits = goldStandardUnits;
    const response = await fetch(`${BRIDGE_URL}/bulk-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Bridge server error at ${ROUTE_4_BULK_ANALYSIS}`);
    return response.json();
};

/**
 * Step 5 – Narrative. Agent: Pro (Lead Author).
 * Calls /api/generate-narrative for thematic report.
 */
export const generateNarrative = async (units: CodedUnit[], themes: Theme[]): Promise<string> => {
    const response = await fetch(`${BRIDGE_URL}/generate-narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ units, themes })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = (data && typeof data.error === 'string') ? data.error : `Narrative failed (${response.status})`;
      throw new Error(msg);
    }
    const text = data != null && typeof data.text === 'string' ? data.text : '';
    return text;
  };