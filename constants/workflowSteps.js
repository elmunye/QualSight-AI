/**
 * Canonical step and agent names for the QualSight workflow.
 * Use these everywhere (server, client, docs) so we can reference steps consistently.
 *
 * Workflow:
 *   Step 1       – Segmentation (unitizing)           → Agent: Pro (Segmenter)
 *   Step 2a     – Taxonomy Analyst                    → Agent: Pro
 *   Step 2b     – Taxonomy Critic                      → Agent: Pro
 *   Step 2c     – Taxonomy Finalizer                  → Agent: Pro
 *   Step 3a     – Sample Selector (comprehensive only) → Agent: Pro
 *   Step 3b     – Sample Coder                        → Agent: Flash
 *   Step 4a     – Bulk Analyst                         → Agent: Flash
 *   Step 4b     – Bulk Critic                          → Agent: Flash
 *   Step 4c     – Bulk Synthesis                       → Server (no LLM)
 *   Step 5      – Narrative                            → Agent: Pro
 */

// --- Step labels (for logs, comments, UI) ---
export const STEP_1_SEGMENTATION = 'Step 1 – Segmentation';
export const STEP_2A_TAXONOMY_ANALYST = 'Step 2a – Taxonomy Analyst';
export const STEP_2B_TAXONOMY_CRITIC = 'Step 2b – Taxonomy Critic';
export const STEP_2C_TAXONOMY_FINALIZER = 'Step 2c – Taxonomy Finalizer';
export const STEP_3A_SAMPLE_SELECTOR = 'Step 3a – Sample Selector';
export const STEP_3B_SAMPLE_CODER = 'Step 3b – Sample Coder';
export const STEP_4A_BULK_ANALYST = 'Step 4a – Bulk Analyst';
export const STEP_4B_BULK_CRITIC = 'Step 4b – Bulk Critic';
export const STEP_4C_BULK_SYNTHESIS = 'Step 4c – Bulk Synthesis';
export const STEP_5_NARRATIVE = 'Step 5 – Narrative';

// --- Agent labels (which model / role) ---
export const AGENT_1_SEGMENTER = 'Agent: Pro (Segmenter)';
export const AGENT_2A_TAXONOMY_ANALYST = 'Agent: Pro (Taxonomy Analyst)';
export const AGENT_2B_TAXONOMY_CRITIC = 'Agent: Pro (Taxonomy Critic)';
export const AGENT_2C_TAXONOMY_FINALIZER = 'Agent: Pro (Taxonomy Finalizer)';
export const AGENT_3A_SAMPLE_SELECTOR = 'Agent: Pro (Sample Selector)';
export const AGENT_3B_SAMPLE_CODER = 'Agent: Flash (Sample Coder)';
export const AGENT_4A_BULK_ANALYST = 'Agent: Flash (Bulk Analyst)';
export const AGENT_4B_BULK_CRITIC = 'Agent: Flash (Bulk Critic)';
export const AGENT_4C_BULK_SYNTHESIS = 'Server (Bulk Synthesis)';
export const AGENT_5_NARRATIVE = 'Agent: Pro (Narrative)';

// --- API / route grouping (for comments) ---
export const ROUTE_1_SEGMENT_DATA = 'Route 1: /api/segment-data (Step 1)';
export const ROUTE_2_GENERATE_TAXONOMY = 'Route 2: /api/generate-taxonomy (Steps 2a, 2b, 2c)';
export const ROUTE_3_GENERATE_SAMPLE_CODING = 'Route 3: /api/generate-sample-coding (Steps 3a, 3b)';
export const ROUTE_4_BULK_ANALYSIS = 'Route 4: /api/bulk-analysis (Steps 4a, 4b, 4c)';
export const ROUTE_5_GENERATE_NARRATIVE = 'Route 5: /api/generate-narrative (Step 5)';
