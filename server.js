import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import {
  STEP_1_SEGMENTATION,
  STEP_2A_TAXONOMY_ANALYST,
  STEP_2B_TAXONOMY_CRITIC,
  STEP_2C_TAXONOMY_FINALIZER,
  STEP_3A_SAMPLE_SELECTOR,
  STEP_3B_SAMPLE_CODER,
  STEP_4A_BULK_ANALYST,
  STEP_4B_BULK_CRITIC,
  STEP_4C_BULK_SYNTHESIS,
  STEP_5_NARRATIVE,
  AGENT_1_SEGMENTER,
  AGENT_2A_TAXONOMY_ANALYST,
  AGENT_2B_TAXONOMY_CRITIC,
  AGENT_2C_TAXONOMY_FINALIZER,
  AGENT_3A_SAMPLE_SELECTOR,
  AGENT_3B_SAMPLE_CODER,
  AGENT_4A_BULK_ANALYST,
  AGENT_4B_BULK_CRITIC,
  AGENT_5_NARRATIVE,
  ROUTE_1_SEGMENT_DATA,
  ROUTE_2_GENERATE_TAXONOMY,
  ROUTE_3_GENERATE_SAMPLE_CODING,
  ROUTE_4_BULK_ANALYSIS,
  ROUTE_5_GENERATE_NARRATIVE,
} from './constants/workflowSteps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (same folder as server.js) so it works regardless of cwd
dotenv.config({ path: path.join(__dirname, '.env') });
export const app = express();

// --- CRITICAL FIX 1: The JSON Scrubber ---
// This prevents crashes when Gemini wraps output in Markdown
const cleanJSON = (rawText) => {
  return rawText.replace(/```json|```/g, "").trim();
};

// 1. Timeout & Middleware
app.use((req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  res.on('timeout', () => {
    console.error('❌ Request Timed Out (180s)');
    if (!res.headersSent) {
      res.status(408).send('Analysis took too long. Try a smaller dataset.');
    }
  });
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- API key: load from .env (create .env with GOOGLE_GENERATIVE_AI_API_KEY=your-key) ---
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
  console.error('\n❌ GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env or set the env var.');
  console.error('   Get a key: https://aistudio.google.com/apikey\n');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 2.5 only (1.5 is deprecated and returns 404 on v1beta). Do not use gemini-1.5-*.
const PRO_MODEL_ID = "gemini-2.5-pro";
const FLASH_MODEL_ID = "gemini-2.5-flash";
const proModel = genAI.getGenerativeModel({ model: PRO_MODEL_ID });
const flashModel = genAI.getGenerativeModel({ model: FLASH_MODEL_ID });

// Turn Google API errors into a short message for the UI
function toUserMessage(err) {
  const m = err?.message || String(err);
  if (m.includes('API_KEY_INVALID') || m.includes('API key not valid')) {
    return 'Invalid or missing API key. Set GOOGLE_GENERATIVE_AI_API_KEY in .env and ensure the key has Gemini 2.5 access at https://aistudio.google.com/apikey';
  }
  if (m.includes('404') || m.includes('not found')) {
    return 'Gemini 2.5 model not available for this key. In AI Studio, enable Gemini 2.5 for your API key.';
  }
  if (m.includes('429') || m.includes('quota') || m.includes('rate')) {
    return 'Rate limit or quota exceeded. Try again in a moment or check your quota in Google AI Studio.';
  }
  if (m.includes('blockReason') || m.includes('blocked')) {
    return 'Response was blocked by safety filters. Try different or shorter input.';
  }
  return m;
}

// --- ROUTE 1: Step 1 – Segmentation (Agent: Pro Segmenter) ---
app.post('/api/segment-data', async (req, res) => {
  try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid text.' });
      }
      console.log(`--- ${STEP_1_SEGMENTATION} | ${AGENT_1_SEGMENTER} (${text.length} chars) ---`);

      const prompt = `
          ### Role
          You are an expert Qualitative Research Assistant specialized in "Unitizing" unstructured data for Thematic Analysis.

          Task: Segment the provided research text into discrete "Meaning Units." 

          ### CRITICAL: DATA VALIDITY CHECK
          Before segmenting, analyze the Input Text.
          **Return an empty array [] (empty JSON array) IMMEDIATELY if the text is:**
          1.  **Non-Semantic:** Random characters, scrambled text, or nonsense (e.g., "asdfjkl").
          2.  **Too Short:** Fewer than 3 words of actual content.
          3.  **Purely Structural:** Only contains headers, page numbers, or timestamps without dialogue/narrative.

          Definitions:
          - Meaning Unit: A segment of text that conveys a single, coherent thought, observation, or sentiment. 
          - Context Preservation: Every unit must remain "codable" on its own. If a pronoun (e.g., "they," "this") refers to a previous sentence, replace it with the specific noun in [brackets].

          Rules:
          1. Granularity: Do not merge two distinct ideas into one unit. Conversely, do not break a single coherent story into fragments that lose meaning.
          2. Citations & Meta-data: Keep citations (e.g., Smith, 2021) attached to the relevant sentence.
          3. Verbatim Integrity: Do not summarize or paraphrase. Keep the participant's original language intact.
          4. Formatting: Output ONLY a valid JSON array of strings.

          Input Text:
          "${text}"

          Output: 
          [
            "Unit 1 text...",
            "Unit 2 text..."
          ]
      `;

      const result = await proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, topP: 0.9 }
      });
      const raw = JSON.parse(cleanJSON(result.response.text()));
      const segments = Array.isArray(raw) ? raw : [];
      const units = segments.map((s, i) => ({ id: `u${i}`, text: typeof s === 'string' ? s : String(s), sourceId: 'upload-1' }));
      console.log(`✅ ${ROUTE_1_SEGMENT_DATA}: ${units.length} units`);
      res.json(units);
  } catch (error) {
      console.error(`${STEP_1_SEGMENTATION} ERROR:`, error);
      res.status(500).json({ error: toUserMessage(error) });
  }
});

// Normalize taxonomy so frontend always gets Theme[] with id, name, subThemes[{ id, name, description }]
function normalizeThemes(raw) {
  const arr = Array.isArray(raw) ? raw : (raw?.themes || raw?.items || []);
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((t, i) => {
    const themeId = t.id || `t${i + 1}`;
    const subs = t.subThemes || t.subthemes || t.sub_themes || [];
    return {
      id: themeId,
      name: t.name || `Theme ${i + 1}`,
      subThemes: subs.map((s, j) => ({
        id: s.id || `s${i + 1}-${j + 1}`,
        name: s.name || `Subtheme ${j + 1}`,
        description: s.description || s.name || ''
      }))
    };
  });
}

// --- ROUTE 2: Steps 2a, 2b, 2c – Taxonomy (Analyst → Critic → Finalizer) ---
const DEFAULT_ANALYST_PURPOSE = 'support interpretation and reporting of key themes';

/** Server-only: fixed suffix (validity check + input data + output format). Not shown in UI. */
function getAnalystPromptFixedSuffix(dataSlice) {
    return `### CRITICAL: DATA VALIDITY CHECK
Before generating any themes, you must assess the **codability** of the input data.
**STOP and return an empty array \`[]\` immediately if the data:**
1.  **Is Non-Semantic:** Consists of random characters (e.g., "asdfjkl"), scrambled text, or corrupted encoding.
2.  **Is Insufficient:** Contains fewer than 10 words of coherent thought or lacks any descriptive content.
3.  **Is Irrelevant:** Contains only structural artifacts (e.g., "Page 1 of 2", "Header", "Footer") without qualitative substance.

**Only proceed to Thematic Analysis if the data contains coherent, human-generated qualitative content.**

### Input Data
${dataSlice}

### Output Format
Return ONLY a valid JSON array.
- If data is valid: Return the array of theme objects.
- If data is invalid: Return \`[]\`.

Structure:
[
  {
    "name": "Theme Label (High-level category)",
    "subThemes": [
      {
        "name": "Sub-theme Label (Specific construct)",
        "description": "Operational definition: Code this when the text discusses..."
      }
    ]
  }
]
`;
}

/** Full prompt for Step 2a when no custom prompt is provided. Contains {{DATA}} for later replacement. */
function buildAnalystPromptTemplate(purpose) {
    const editable = buildEditablePromptTemplate(purpose);
    return editable + '\n\n' + getAnalystPromptFixedSuffix('{{DATA}}');
}

/** User-editable part only: Role, Task, Rules. Shown in UI. No validity check, no input data, no output format. */
function buildEditablePromptTemplate(purpose) {
    const p = purpose && String(purpose).trim() ? purpose.trim() : DEFAULT_ANALYST_PURPOSE;
    return `### Role
You are a Lead Qualitative Methodologist conducting an Inductive Thematic Analysis. Your goal is to build a codebook that captures the nuance, friction, and underlying mechanisms in the data, ultimately to ${p}.

### Task
Analyze the provided data segments and construct a hierarchical codebook of Themes and Sub-themes.

### Rules for Code Generation
1.  **Avoid "Bucket" Codes**: Do not use generic labels like "Pros," "Cons," "Positive," or "Miscellaneous." Theme names must be descriptive of the *phenomenon* (e.g., instead of "Communication Issues," use "Siloed Information Flow").
2.  **Inductive Approach**: Build themes bottom-up from the data. Do not impose outside frameworks.
3.  **Operational Definitions**: The "description" field must be an *instruction* to a human coder. It should explain exactly what criteria constitute this sub-theme.
4.  **Granularity**: A Sub-theme should cover a distinct concept. If two sub-themes overlap significantly, merge them.
`;
}

// Return only the editable part (Role, Task, Rules) for display/edit in UI. No validity check, no input data, no output format.
app.get('/api/taxonomy-prompt', (req, res) => {
    try {
        const purpose = req.query.purpose != null ? String(req.query.purpose) : DEFAULT_ANALYST_PURPOSE;
        const prompt = buildEditablePromptTemplate(purpose);
        res.json({ prompt });
    } catch (e) {
        res.status(500).json({ error: 'Failed to build prompt template.' });
    }
});

app.post('/api/generate-taxonomy', async (req, res) => {
    try {
        const { rawText, contextType, purpose, customAnalystPrompt } = req.body;
        if (!rawText || typeof rawText !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid rawText. Paste your data first.' });
        }
        const ctx = contextType || 'Interview Transcripts';
        console.log(`--- ${ROUTE_2_GENERATE_TAXONOMY} (${ctx}) ---`);

        const dataSlice = rawText.slice(0, 15000);

        // Step 2a – Taxonomy Analyst (Pro)
        console.log(`--- ${STEP_2A_TAXONOMY_ANALYST} | ${AGENT_2A_TAXONOMY_ANALYST} ---`);
        const analystPrompt = customAnalystPrompt && typeof customAnalystPrompt === 'string'
            ? customAnalystPrompt.trim() + '\n\n' + getAnalystPromptFixedSuffix(dataSlice)
            : buildAnalystPromptTemplate(purpose).replace(/\{\{DATA\}\}/g, dataSlice);

        const analystResult = await proModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: analystPrompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        });
        const initialTaxonomy = cleanJSON(analystResult.response.text());

        // Step 2b – Taxonomy Critic (Methodological Auditor)
        console.log(`--- ${STEP_2B_TAXONOMY_CRITIC} | Agent B: Methodological Auditor ---`);
        const criticPrompt = `
          ### Role

          You are a Senior Qualitative Auditor. Your job is to strictly evaluate the proposed Codebook against the Research Context to ensure validity, mutual exclusivity, and conceptual depth.

          ### Context

          Research Context/Goals: ${ctx}

          ### Input

          Proposed Taxonomy: ${initialTaxonomy}

          ### Task

          Audit the taxonomy. You must be critical. Look for three specific types of failure:

          1. **Conceptual Overlap (Redundancy):** Two themes or sub-themes that describe the same phenomenon. (Action: MERGE)
          2. **Vagueness (Specificity):** Theme names that are generic "buckets" (e.g., "Benefits," "Issues") rather than analytic concepts. (Action: RENAME)
          3. **Misalignment (Logic):** Sub-themes that do not logically belong to their parent theme. (Action: MOVE or DELETE)

          ### Output Format

          Return ONLY a valid JSON object containing an array of specific "action_items".

          Structure:
          {
            "critique_summary": "One sentence summary of the codebook quality.",
            "action_items": [
              {
                "type": "MERGE",
                "targets": ["Theme A", "Theme B"],
                "reason": "Both themes describe financial constraints; distinction is negligible."
              },
              {
                "type": "RENAME",
                "target": "Old Name",
                "suggestion": "New Concept-Driven Name",
                "reason": "Original was too generic."
              },
              {
                "type": "MOVE",
                "target": "Sub-theme Name",
                "from_parent": "Current Parent",
                "to_parent": "Suggested Parent",
                "reason": "The concept fits better under the structural theme."
              },
              {
                "type": "DELETE",
                "target": "Theme/Sub-theme Name",
                "reason": "This concept is redundant with [another theme/sub-theme] and does not offer unique analytical value, or it is outside the scope of the research context."
              }
            ]
          }
              `;
        const criticResult = await proModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: criticPrompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        });
        const critique = cleanJSON(criticResult.response.text());

        // Step 2c – Taxonomy Finalizer (Principal Investigator)
        console.log(`--- ${STEP_2C_TAXONOMY_FINALIZER} | Agent C: Taxonomy Finalizer ---`);
        const finalPrompt = `
    ### Role
    You are the Principal Investigator and Lead Taxonomist. You hold final editorial authority over the qualitative codebook.

    ### Inputs
    1. **Research Context:** ${ctx}
    2. **Draft Taxonomy:** ${initialTaxonomy}
    3. **Auditor's Critique:** ${critique}

    ### Task
    Synthesize the Final Taxonomy. You must evaluate the **Draft Taxonomy** in light of the **Auditor's Critique**, exercising independent judgment to create the most analytically powerful codebook.

    ### Decision-Making Rubric (Adjudication Rules)
    1.  **Evaluate the Critique:** Do not blindly accept the Auditor's suggestions.
        * *ACCEPT* the suggestion if it reduces redundancy, clears up vague language, or improves logic.
        * *REJECT* the suggestion if it over-simplifies complex concepts or merges two distinct phenomena that are important to the Research Context.
        * *MODIFY* the suggestion if the core idea is good but the naming/structure can be improved further.
    2.  **Prioritize Nuance vs. Parsimony:**
        * If the dataset is small/simple, favor a concise list (Accept Merges).
        * If the dataset is complex/technical, favor granularity (Reject Merges that lose detail).
    3.  **Final Polish:**
        * Ensure all Theme/Sub-theme names are professional and academic (e.g., change "Bad Money Stuff" to "Financial Constraints").
        * Regenerate all IDs to be sequential (t1, t2... s1-1, s1-2...).

    ### Output Format
    Return ONLY a valid JSON array.
    Structure:
    [
      {
        "id": "t1",
        "name": "Theme Name",
        "subThemes": [
          {
            "id": "s1-1",
            "name": "Sub-theme Name",
            "description": "Operational definition (Finalized and clear)..."
          }
        ]
      }
    ]
        `;
        const finalResult = await proModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' }
        });
        const raw = JSON.parse(cleanJSON(finalResult.response.text()));
        const themes = normalizeThemes(raw);
        res.json(themes);
    } catch (error) {
        console.error(`${ROUTE_2_GENERATE_TAXONOMY} ERROR:`, error);
        res.status(500).json({ error: toUserMessage(error) });
    }
});

// --- ROUTE 3: Steps 3a, 3b – Sample coding (HITL calibration) ---
app.post('/api/generate-sample-coding', async (req, res) => {
    try {
      const { units, themes, mode } = req.body;
      let selectedUnits = [];
      const normalize = (id) => String(id || '').toLowerCase().replace(/[^0-9]/g, '');

      if (mode === 'comprehensive') {
        // Step 3a – Sample Selector (The Representative Scout)
        console.log(`--- ${STEP_3A_SAMPLE_SELECTOR} | The Representative Scout ---`);
        const poolSize = Math.min(units.length, 50);
        const selectorPrompt = `
    ### Role
    You are a Data Curator. Your goal is to select a diverse set of "Representative Examples" from the provided Data Pool to verify a new Codebook.

    ### Input
    1. **Codebook:** ${JSON.stringify(themes)}
    2. **Data Pool:** ${JSON.stringify(units.slice(0, poolSize))}

    ### Task
    Scan the Data Pool and identify the *single best* text segment that exemplifies each Sub-theme in the Codebook.

    ### Selection Criteria
    1. **Clarity:** The selected text must clearly match the definition of the sub-theme.
    2. **Diversity:** Try to find at least one unique unit for every sub-theme available in the pool.
    3. **Constraint:** If no unit fits a specific sub-theme, do not force a selection for it.

    ### Output
    Return ONLY a JSON array of objects connecting a unit to a theme.
    Format: [{"unitId": "u12", "themeId": "t1", "subThemeId": "s1-1"}]
    `;
        const result = await proModel.generateContent(selectorPrompt);
        // FIXED: Parsing
        const rawOutput = JSON.parse(cleanJSON(result.response.text()));
        
        const finalSelectionIds = new Set();
        themes.forEach(theme => {
          theme.subThemes.forEach(sub => {
            const matches = rawOutput.filter(r => normalize(r.themeId || r.id) === normalize(theme.id) && normalize(r.subThemeId) === normalize(sub.id));
            if (matches.length > 0) {
              finalSelectionIds.add(normalize(matches[0].unitId || matches[0].id));
            }
          });
        });
        selectedUnits = units.filter(u => finalSelectionIds.has(normalize(u.id)));
      } else {
        selectedUnits = [...units].sort(() => 0.5 - Math.random()).slice(0, 8);
      }
  
      // Step 3b – Sample Coder (The Draftsman)
      console.log(`--- ${STEP_3B_SAMPLE_CODER} | The Draftsman ---`);
      const finalPrompt = `
    ### Role
    You are a Qualitative Coder applying a strict Codebook to research data.

    ### Input
    1. **Codebook:** ${JSON.stringify(themes)}
    2. **Selected Units:** ${JSON.stringify(selectedUnits)}

    ### Task
    Assign the most appropriate Theme and Sub-theme to *every* unit. Do not return null: always assign your *best available* code from the codebook.

    ### Coding Rules
    1. **Best Fit:** For each unit, choose the theme and sub-theme that fit best according to the "description" fields. If the text clearly satisfies an operational definition, set **strictFit: true**.
    2. **Weak/Ambiguous Fit:** If the text does not clearly match any definition (short, vague, or off-topic), still assign your *best guess* from the codebook and set **strictFit: false** so the user can review. Never use null.
    3. **Reasoning:** Provide a concise, 1-sentence justification. For strictFit: false, briefly note why the fit is uncertain.

    ### Output
    Return ONLY a JSON array.
    Format:
    [
      {
        "unitId": "...",
        "themeId": "t1",
        "subThemeId": "s1-1",
        "strictFit": true,
        "reasoning": "Participant explicitly mentions [keyword], which aligns with the definition of [Sub-theme Name]."
      }
    ]
    (themeId and subThemeId must always be valid IDs from the codebook; strictFit: true when clear match, false when best guess only.)
      `;
      const finalResult = await flashModel.generateContent(finalPrompt);
      const aiTags = JSON.parse(cleanJSON(finalResult.response.text()));
      const firstThemeId = themes.length > 0 ? themes[0].id : '';
      const firstSubThemeId = themes.length > 0 && (themes[0].subThemes || []).length > 0 ? themes[0].subThemes[0].id : '';

      const finalizedSamples = (Array.isArray(aiTags) ? aiTags : []).map(tag => {
        const foundId = tag.unitId || tag.id || tag.uId || tag.unit_id;
        const match = selectedUnits.find(u => normalize(u.id) === normalize(foundId));
        const rawThemeId = tag.themeId || tag.theme_id || '';
        const rawSubThemeId = tag.subThemeId || tag.sub_theme_id || '';
        const isNullTheme = rawThemeId === '' || rawThemeId === 'null' || rawThemeId == null;
        const isNullSub = rawSubThemeId === '' || rawSubThemeId === 'null' || rawSubThemeId == null;
        const themeId = isNullTheme ? firstThemeId : rawThemeId;
        const subThemeId = isNullSub ? firstSubThemeId : rawSubThemeId;
        const strictFit = tag.strictFit !== false && !isNullTheme && !isNullSub;
        return {
          ...tag,
          unitId: match ? match.id : (foundId || "unknown"),
          themeId,
          subThemeId,
          strictFit: !!tag.strictFit && !isNullTheme && !isNullSub,
          confidence: strictFit ? (tag.confidence != null ? tag.confidence : 0.85) : 0.5,
          text: match ? match.text : "Text context lost"
        };
      });

      res.json(finalizedSamples);
    } catch (error) {
      console.error(`${ROUTE_3_GENERATE_SAMPLE_CODING} ERROR:`, error);
      res.status(500).json({ error: toUserMessage(error) });
    }
});

// --- ROUTE 4: Steps 4a, 4b, 4c – Bulk analysis (Analyst → Critic → Synthesis) ---
app.post('/api/bulk-analysis', async (req, res) => {
    try {
      const { units, themes, corrections, goldStandardUnits } = req.body;
      console.log(`--- ${ROUTE_4_BULK_ANALYSIS} (${units.length} units) ---`);

      // Few-shot examples from user-validated sample units (Step 3 corrections)
      const fewShotExamples = Array.isArray(goldStandardUnits) && goldStandardUnits.length > 0
        ? goldStandardUnits.map(g => 
            `Unit ${g.unitId || g.id}: "${(g.text || '').slice(0, 300)}${(g.text || '').length > 300 ? '...' : ''}" → Theme: ${g.themeId || ''}, Sub-theme: ${g.subThemeId || ''}`
          ).join('\n       ')
        : 'None - apply the Taxonomy operational definitions only.';

      // Step 4a – Bulk Analyst (The Bulk Analyst)
      console.log(`--- ${STEP_4A_BULK_ANALYST} | The Bulk Analyst ---`);
      const analystPrompt = `
    ### Role
    You are a Production Qualitative Analyst. You are scaling a thematic analysis across a large dataset.

    ### Inputs
    1. **The Taxonomy (Codebook):** ${JSON.stringify(themes)}

    2. **Gold Standard Examples (USER VALIDATED - FOLLOW THESE STRICTLY):**
       ${fewShotExamples}

    3. **Data to Analyze:** ${JSON.stringify(units)}

    ### Task
    Code the "Data to Analyze" using the Taxonomy. Assign a theme and subtheme to *every* unit (no nulls). Always use valid themeId and subThemeId from the codebook.

    ### Alignment Strategy
    1. **Pattern Matching:** Compare new units against the "Gold Standard Examples." If a new unit resembles a Gold Standard example, apply the same coding logic.
    2. **Operational Definitions:** For units that do not resemble the examples, choose the *best available* theme/subtheme from the "description" fields.
    3. **Ambiguity:** If a unit is ambiguous, assign your *best guess* and set **strictFit: false** so it is flagged for review. Never return null.

    ### Output
    Return ONLY a JSON array.
    Structure:
    [
      {
        "unitId": "u105",
        "themeId": "t2",
        "subThemeId": "s2-3",
        "strictFit": true,
        "reasoning": "Similar to Gold Standard example regarding 'server latency'."
      }
    ]
    (strictFit: true when clear match; strictFit: false when best guess only. themeId/subThemeId must always be valid IDs.)
      `;
      const analystResult = await flashModel.generateContent(analystPrompt);
      const rawPrimaryTags = JSON.parse(cleanJSON(analystResult.response.text()));
      const bulkFirstThemeId = themes.length > 0 ? themes[0].id : '';
      const bulkFirstSubThemeId = themes.length > 0 && (themes[0].subThemes || []).length > 0 ? themes[0].subThemes[0].id : '';
      const primaryTags = (Array.isArray(rawPrimaryTags) ? rawPrimaryTags : []).map(tag => {
        const tid = tag.themeId || tag.theme_id || '';
        const sid = tag.subThemeId || tag.sub_theme_id || '';
        const tidNull = !tid || tid === 'null';
        const sidNull = !sid || sid === 'null';
        return {
          ...tag,
          themeId: tidNull ? bulkFirstThemeId : tid,
          subThemeId: sidNull ? bulkFirstSubThemeId : sid,
          strictFit: tag.strictFit !== false && !tidNull && !sidNull
        };
      });

      // Step 4b – Bulk Critic (Flash): audit analyst codes with text + codebook
      console.log(`--- ${STEP_4B_BULK_CRITIC} | ${AGENT_4B_BULK_CRITIC} ---`);
      const auditPayload = primaryTags.map(tag => {
        const original = units.find(u => String(u.id) === String(tag.unitId));
        return {
          unitId: tag.unitId,
          text: original ? original.text : "Error: Text missing",
          assignedTheme: tag.themeId,
          assignedSubTheme: tag.subThemeId,
          analystReasoning: tag.reasoning
        };
      });
      const criticPrompt = `
    ### Role
    You are a QA Specialist. You are auditing a qualitative coding dataset.

    ### Inputs
    1. **Codebook:** ${JSON.stringify(themes)}
    2. **Coding Draft:** ${JSON.stringify(auditPayload)}

    ### Task
    Review each item. Determine if the "assignedTheme" and "assignedSubTheme" are accurate based on the "text" and the Codebook definitions.

    ### Rules
    1. **Deference:** If the assignment is reasonable/defensible, mark it as "AGREE". Do not nitpick.
    2. **Correction:** If the assignment is clearly wrong (hallucination, missed obvious keyword, wrong sentiment), mark as "DISAGREE" and provide the *correct* themeId and subThemeId (valid IDs from the codebook).
    3. **Nuance:** If the text is too short/ambiguous, suggest the *best available* theme/subtheme (do not suggest null). Mark as "DISAGREE" with your suggested correction so it is flagged for review.

    ### Output
    Return ONLY a JSON array.
    Format:
    [
      {
        "unitId": "u0",
        "status": "AGREE",
        "correction": null,
        "critique": "Correctly identified financial constraint."
      },
      {
        "unitId": "u1",
        "status": "DISAGREE",
        "correction": { "themeId": "t2", "subThemeId": "s2-1" },
        "critique": "Text discusses 'time', not 'money'. Should be t2."
      }
    ]
      `;
      const criticResult = await flashModel.generateContent(criticPrompt);
      const auditReport = JSON.parse(cleanJSON(criticResult.response.text()));

      // Step 4c – Bulk Synthesis & Adjudication (split consensus vs conflicts, adjudicate conflicts, merge)
      console.log(`--- ${STEP_4C_BULK_SYNTHESIS} ---`);
      const conflicts = [];
      const consensus = [];
      const auditList = Array.isArray(auditReport) ? auditReport : [];

      auditList.forEach(audit => {
        const originalTag = primaryTags.find(t => String(t.unitId) === String(audit.unitId));
        if (!originalTag) return;
        const status = (audit.status || "").toUpperCase();
        if (status === "AGREE") {
          consensus.push({
            ...originalTag,
            confidence: 0.95,
            peerValidated: true
          });
        } else {
          conflicts.push({
            unitId: audit.unitId,
            text: units.find(u => String(u.id) === String(audit.unitId))?.text,
            optionA: { themeId: originalTag.themeId, subThemeId: originalTag.subThemeId, reasoning: originalTag.reasoning },
            optionB: { themeId: audit.correction?.themeId, subThemeId: audit.correction?.subThemeId, reasoning: audit.critique }
          });
        }
      });

      // Units in primaryTags but not in audit report → treat as consensus
      const seenUnitIds = new Set([...consensus.map(c => c.unitId), ...conflicts.map(c => c.unitId)]);
      primaryTags.forEach(tag => {
        if (seenUnitIds.has(tag.unitId)) return;
        consensus.push({ ...tag, confidence: 0.85, peerValidated: false });
      });

      let adjudicatedResults = [];
      if (conflicts.length > 0) {
        console.log(`--- Adjudicating ${conflicts.length} conflicts (Pro) ---`);
        const judgePrompt = `
        ### Role
        You are the Chief Editor. Two analysts (Agent A and Agent B) disagree on the coding of the following text segments.

        ### Context
        Codebook: ${JSON.stringify(themes)}

        ### Task
        Review the "Disputed Items" below. Decide which Agent is correct, or if both are wrong, provide your own coding.

        ### Disputed Items
        ${JSON.stringify(conflicts)}

        ### Decision Rules
        1. **Compare:** Look at Option A (Analyst) and Option B (Critic).
        2. **Decide:** Which one matches the Codebook definition better?
        3. **Override:** If both are wrong, provide a "New Ruling".

        ### Output
        Return ONLY a JSON array of final decisions.
        Format:
        [
          {
            "unitId": "u5",
            "finalThemeId": "t1",
            "finalSubThemeId": "s1-2",
            "confidence": 0.75,
            "ruling": "Agent B is correct. The text explicitly mentions 'deadlines', fitting 'Time Pressure'."
          }
        ]
        `;
        const judgeResult = await proModel.generateContent(judgePrompt);
        adjudicatedResults = JSON.parse(cleanJSON(judgeResult.response.text())) || [];
      }

      // Merge consensus + adjudicated into final dataset; attach text and uniform shape for downstream
      const adjudicatedWithText = adjudicatedResults.map(r => {
        const tid = (r.finalThemeId != null && r.finalThemeId !== 'null') ? r.finalThemeId : (r.themeId || bulkFirstThemeId);
        const sid = (r.finalSubThemeId != null && r.finalSubThemeId !== 'null') ? r.finalSubThemeId : (r.subThemeId || bulkFirstSubThemeId);
        return {
          unitId: r.unitId,
          themeId: tid,
          subThemeId: sid,
          reasoning: r.ruling,
          confidence: parseFloat(r.confidence) || 0.75,
          peerValidated: false,
          strictFit: false
        };
      });
      const finalDataset = [
        ...consensus.map(c => {
          const originalUnit = units.find(u => String(u.id) === String(c.unitId));
          return {
            ...c,
            text: originalUnit ? originalUnit.text : "Observation context lost"
          };
        }),
        ...adjudicatedWithText.map(r => {
          const originalUnit = units.find(u => String(u.id) === String(r.unitId));
          return {
            ...r,
            text: originalUnit ? originalUnit.text : "Observation context lost"
          };
        })
      ];

      res.json(finalDataset);
    } catch (error) {
      console.error(`${ROUTE_4_BULK_ANALYSIS} ERROR:`, error);
      res.status(500).json({ error: toUserMessage(error) });
    }
  });

// --- ROUTE 5: Step 5 – Narrative (Lead Author / Pro) ---
app.post('/api/generate-narrative', async (req, res) => {
  try {
    const { units, themes } = req.body;
    console.log(`--- ${STEP_5_NARRATIVE} | Agent E: Lead Author ---`);

    // Group units by theme and sub-theme so the LLM sees structure and can cite quotes
    const organizedData = (Array.isArray(themes) ? themes : []).map(theme => {
      const relevantUnits = (Array.isArray(units) ? units : []).filter(u => String(u.themeId) === String(theme.id));
      return {
        themeName: theme.name,
        themeId: theme.id,
        count: relevantUnits.length,
        subThemes: (theme.subThemes || []).map(sub => {
          const subUnits = relevantUnits.filter(u => String(u.subThemeId) === String(sub.id));
          const maxQuotesPerSub = 25;
          const quotes = subUnits.slice(0, maxQuotesPerSub).map(u =>
            `"${(u.text || '').replace(/"/g, "'")}" (Unit ${u.unitId != null ? u.unitId : u.id})`
          );
          return {
            subThemeName: sub.name,
            subThemeId: sub.id,
            description: sub.description,
            count: subUnits.length,
            quotes
          };
        })
      };
    });

    const writerPrompt = `
    ### Role
    You are a Lead Qualitative Researcher writing the final Thematic Analysis Report for a client.

    ### Input Data
    ${JSON.stringify(organizedData, null, 2)}

    ### Task
    Synthesize the provided data into a cohesive analytical narrative.

    ### Report Structure & Requirements

    **1. Executive Summary (1 Paragraph)**
    - Summarize the "Big Picture." What is the dominant narrative across the entire dataset?

    **2. Thematic Deep Dives (One Section per Theme)**
    - **Header:** Theme Name
    - **Content:** Write 1-2 rich paragraphs analyzing this theme.
    - **Analysis Framework:** Do not just list what people said. You must explicitly analyze:
        * **Prevalence:** Is this a niche view or a consensus?
        * **Tension:** Are there contradictions within this theme? (e.g., "While many participants praised X, a vocal minority noted Y.")
        * **Surprise:** Did anything emerge that contradicts standard assumptions?
    - **Evidence:** You MUST integrate *direct quotes* from the data to support your points. Use the format: "...quote text..." (Unit #).

    **3. Conclusion**
    - Offer one final "Key Insight" or recommendation based on the data.

    ### Tone Guidelines
    - **Tone:** Academic, objective, yet narrative-driven. Avoid robotic phrases like "The data suggests."
    - **Voice:** Active and authoritative.
    - **Formatting:** Use Markdown (## Headers, **Bold** for emphasis).

    ### Output
    Return the report as a clean Markdown string.
    `;

    const result = await proModel.generateContent(writerPrompt);
    const narrativeText = result.response.text();

    res.json({ text: narrativeText });
  } catch (error) {
    console.error(`${STEP_5_NARRATIVE} ERROR:`, error);
    res.status(500).json({ error: toUserMessage(error) });
  }
});

// --- DEPLOYMENT CONFIGURATION ---
const port = process.env.PORT || 8080;
app.use(express.static(path.join(__dirname, 'dist'))); 

app.get('/*path', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: "API Route Not Found" });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 QualiSight LIVE on port ${port}`);
    console.log(`   Models: ${PRO_MODEL_ID}, ${FLASH_MODEL_ID}`);
    console.log(`   Open in browser: http://localhost:${port}`);
    console.log(`   (For dev UI on port 3000, run "npm run dev" in another terminal.)`);
  });
}