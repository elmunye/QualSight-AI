# QualSight AI – Step-by-step workflow

This document describes how each step is **triggered** (from the frontend), which **API** and **agent(s)** run on the server, and the **inputs and outputs** at each step. Step and agent names match the constants in **`constants/workflowSteps.js`** so you can reference them consistently in code, logs, and docs.

---

## Canonical step and agent names (from `constants/workflowSteps.js`)

| Step | Label | Agent |
|------|--------|--------|
| **Step 1** | Step 1 – Segmentation | Agent: Pro (Segmenter) |
| **Step 2a** | Step 2a – Taxonomy Analyst | Agent: Pro (Taxonomy Analyst) |
| **Step 2b** | Step 2b – Taxonomy Critic | Agent: Pro (Taxonomy Critic) |
| **Step 2c** | Step 2c – Taxonomy Finalizer | Agent: Pro (Taxonomy Finalizer) |
| **Step 3a** | Step 3a – Sample Selector | Agent: Pro (Sample Selector) – comprehensive only |
| **Step 3b** | Step 3b – Sample Coder | Agent: Flash (Sample Coder) |
| **Step 4a** | Step 4a – Bulk Analyst | Agent: Flash (Bulk Analyst) |
| **Step 4b** | Step 4b – Bulk Critic | Agent: Flash (Bulk Critic) |
| **Step 4c** | Step 4c – Bulk Synthesis | Server (Bulk Synthesis) – no LLM |
| **Step 5** | Step 5 – Narrative | Agent: Pro (Narrative) |

---

## High-level flow (who triggers what)

| Phase (UI) | User action | What runs (parallel or sequence) |
|------------|-------------|-----------------------------------|
| **Ingestion** | Paste data, set context/purpose, click “Generate Taxonomy” | **Step 1** (Segmentation) + **Steps 2a/2b/2c** (Taxonomy) in parallel |
| **Taxonomy** | Review/edit themes, click “Approve & Start Sampling” | (no server call; state only) |
| **Sampling selection** | Choose “Quick” or “Grid-Hunter” | **Step 3a** (optional) + **Step 3b** (Sample Coder) |
| **Sampling** | Review sample codings, click to continue | (no server call until “complete”) |
| **Bulk analysis** | Triggered automatically when user completes sampling | **Steps 4a, 4b, 4c** (many batches in a loop) |
| **Analysis/Dashboard** | Optionally click “Generate narrative” | **Step 5** (Narrative) |

---

## Step 1 – Segmentation

**Trigger:** User completes Ingestion and clicks “Generate Taxonomy” in `Phase1Ingestion`.  
**Called from:** `App.tsx` → `handleIngestionComplete()` → `segmentData(text)` (runs in parallel with Steps 2a/2b/2c).

| Item | Detail |
|------|--------|
| **API** | `POST /api/segment-data` |
| **Step / Agent** | **Step 1 – Segmentation** \| **Agent: Pro (Segmenter)** |
| **Input** | `{ text: string }` – raw pasted/uploaded text |
| **Output** | Array of **data units**: `[{ id: "u0", text: "…", sourceId: "upload-1" }, …]` |
| **Server** | `server.js`: unitizing prompt → `proModel.generateContent()` → `JSON.parse(cleanJSON(...))` → map to `{ id, text, sourceId }` → `res.json(units)` |

The result is stored in `dataUnits` and used later for sampling and bulk analysis.

---

## Steps 2a, 2b, 2c – Taxonomy (Analyst → Critic → Finalizer)

**Trigger:** Same as Step 1 – “Generate Taxonomy” in Ingestion.  
**Called from:** `App.tsx` → `handleIngestionComplete()` → `generateTaxonomy(text, context, options)` (runs in parallel with Step 1).

| Item | Detail |
|------|--------|
| **API** | `POST /api/generate-taxonomy` |
| **Input** | `{ rawText, contextType, purpose?, customAnalystPrompt? }` |
| **Output** | Normalized **themes**: `[{ id, name, subThemes: [{ id, name, description }] }, …]` |

This single API runs **three steps in sequence** on the server:

| Step | Label | Agent | Input | Output |
|------|--------|--------|-------|--------|
| **2a** | Step 2a – Taxonomy Analyst | Agent: Pro (Taxonomy Analyst) | Analyst prompt (purpose/custom prompt + first 15k chars of `rawText` as data) | Initial taxonomy as JSON array (themes + subThemes) |
| **2b** | Step 2b – Taxonomy Critic | Agent: Pro (Taxonomy Critic) | Context type + initial taxonomy; instructions to return redundancies, suggested renames, missing gaps | JSON: `{ redundancies, suggestedRenames, missingGaps }` |
| **2c** | Step 2c – Taxonomy Finalizer | Agent: Pro (Taxonomy Finalizer) | Initial taxonomy + critique; instructions to output final JSON array with ids | Final taxonomy JSON array → normalized to `Theme[]` (ids, names, subThemes) |

The response of the **whole** `/api/generate-taxonomy` call is this normalized theme list. It is stored in `themes` and shown in Phase 2 for user review/edit.

---

## Steps 3a, 3b – Sample coding (HITL calibration)

**Trigger:** User is in Sampling selection phase and chooses “Quick” or “Grid-Hunter”.  
**Called from:** `App.tsx` → `handleStartSampling(mode)` → `generateSampleCoding(dataUnits, themes, mode)`.

| Item | Detail |
|------|--------|
| **API** | `POST /api/generate-sample-coding` |
| **Input** | `{ units: DataUnit[], themes: Theme[], mode: 'quick' | 'comprehensive' }` |
| **Output** | Array of **coded sample units**: `[{ unitId, themeId, subThemeId, text, reasoning?, … }]` |

**Server behavior:**

| Step | Label | Agent | Input | Output |
|------|--------|--------|-------|--------|
| **3a (optional)** | Step 3a – Sample Selector | Agent: Pro (Sample Selector) – comprehensive only | Up to 50 units + themes; prompt to return `[{ unitId, themeId, subThemeId }]` | JSON array of assignments → used to pick one unit per theme/subtheme for “grid” coverage |
| **3b** | Step 3b – Sample Coder | Agent: Flash (Sample Coder) | **Selected units** (8 random in quick mode, or grid-selected in comprehensive) + themes; prompt to return codings with reasoning | JSON array: `[{ unitId, themeId, subThemeId, reasoning, … }]` → merged with unit `text`, returned as `CodedUnit[]` |

So: one or two model calls inside one API; the **output** of the API is the list of sample codings shown in the Sampling phase for user correction.

---

## Steps 4a, 4b, 4c – Bulk analysis (Analyst → Critic → Synthesis)

**Trigger:** User finishes the Sampling phase and confirms (e.g. “Continue” / complete calibration).  
**Called from:** `App.tsx` → `handleSamplingComplete(corrections)` → loop over `dataUnits` in batches of 10 → for each batch, `performBulkAnalysis(batch, themes, corrections)`.

| Item | Detail |
|------|--------|
| **API** | `POST /api/bulk-analysis` |
| **Input** | `{ units: DataUnit[], themes: Theme[], corrections: SampleCorrection[] }` (per batch) |
| **Output** | Array of **coded units** for that batch: `[{ unitId, themeId, subThemeId, text, confidence, peerValidated, … }]` |

**Server behavior (per batch):**

| Step | Label | Agent | Input | Output |
|------|--------|--------|-------|--------|
| **4a** | Step 4a – Bulk Analyst | Agent: Flash (Bulk Analyst) | Expert rules built from `corrections` + taxonomy + batch units; prompt to categorize each unit | JSON array: `[{ unitId, themeId, subThemeId, reasoning }]` |
| **4b** | Step 4b – Bulk Critic | Agent: Flash (Bulk Critic) | Analyst’s classifications + taxonomy; prompt to agree/flag and optionally suggest theme | JSON array: `[{ unitId, agree, suggestedThemeId? }]` |
| **4c** | Step 4c – Bulk Synthesis | Server (Bulk Synthesis) – no LLM | Analyst tags + critic consensus + original units | Combined list with `confidence` and `peerValidated`; `res.json(finalizedResults)` |

Batches are requested sequentially from the frontend; results are concatenated into `analysisResults.codedUnits` and used for charts and narrative.

---

## Step 5 – Narrative

**Trigger:** User is on the Analysis dashboard and clicks “Generate narrative” (or equivalent).  
**Called from:** `App.tsx` → `handleGenerateNarrative()` → `generateNarrative(analysisResults.codedUnits, themes)`.

| Item | Detail |
|------|--------|
| **API** | `POST /api/generate-narrative` |
| **Step / Agent** | **Step 5 – Narrative** \| **Agent: Pro (Narrative)** |
| **Input** | `{ units: CodedUnit[], themes: Theme[] }` (units are capped to first 50 in the prompt) |
| **Output** | `{ text: string }` – narrative summary (3–4 paragraphs) |
| **Server** | `server.js`: narrative prompt with themes + analyzed data → `proModel.generateContent()` → `res.json({ text: narrativeText })` |

The narrative is stored in `analysisResults.narrative` and shown on the dashboard.

---

## Auxiliary: prompt template (no agent)

**Trigger:** User clicks “View & edit analyst prompt” in Ingestion.  
**Called from:** `Phase1Ingestion` → `fetchTaxonomyPromptTemplate(purpose)`.

| Item | Detail |
|------|--------|
| **API** | `GET /api/taxonomy-prompt?purpose=...` |
| **Agent** | None (server-only) |
| **Input** | Query: `purpose` (optional) |
| **Output** | `{ prompt: string }` – analyst prompt template with purpose filled in and `{{DATA}}` as placeholder |

Used only to display and optionally edit the prompt before **Step 2a** (Taxonomy Analyst).

---

## Summary table (server-side only)

| Step(s) | API route | Model(s) / Agent | Main input | Main output |
|---------|-----------|------------------|------------|-------------|
| Step 1 | `POST /api/segment-data` | Pro (Segmenter) | Raw text | DataUnit[] |
| Steps 2a, 2b, 2c | `POST /api/generate-taxonomy` | Pro (×3: Analyst, Critic, Finalizer) | rawText, contextType, purpose?, customAnalystPrompt? | Theme[] |
| Steps 3a, 3b | `POST /api/generate-sample-coding` | Pro (Sample Selector, optional) + Flash (Sample Coder) | units, themes, mode | CodedUnit[] (samples) |
| Steps 4a, 4b, 4c | `POST /api/bulk-analysis` | Flash (Analyst, Critic) + Server (Synthesis) | units, themes, corrections | CodedUnit[] (batch) |
| Step 5 | `POST /api/generate-narrative` | Pro (Narrative) | units, themes | { text } |
| — | `GET /api/taxonomy-prompt` | — | purpose (query) | { prompt } |

This should make it clear how the steps are executed: the **order and parallelism** are determined by the frontend (App phases and handlers); each **step** corresponds to one or more **agent** calls inside a single API route in `server.js`. Use the labels from **`constants/workflowSteps.js`** everywhere for consistency.
