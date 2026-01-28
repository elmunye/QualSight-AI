import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";

// ADD THIS LINE BELOW YOUR IMPORTS
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// 1. Timeout & Middleware
app.use((req, res, next) => {
  req.setTimeout(180000); 
  res.setTimeout(180000);
  res.on('timeout', () => {
    console.error('❌ Request Timed Out (180s)');
    if (!res.headersSent) {
      res.status(408).send('Analysis took too long. Try a smaller dataset.');
    }
  });
  next();
});

app.use(cors());
app.use(express.json());

// 2. Initialize the AI with your API Key
// This reads the key you provided in the 'gcloud run deploy' command
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Use 1.5 Pro and Flash (The current stable production standards)
const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
const flashModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- NEW: INTELLIGENT SEGMENTATION ROUTE ---
// This uses AI to ensure citations stay attached to their sentences.
app.post('/api/segment-data', async (req, res) => {
    try {
        const { text } = req.body;
        console.log("--- Segmenting Data with AI ---");

        const prompt = `
            Task: Segment the following research notes into individual "data units."
            Rules:
            1. Each unit must be a standalone observation or meaningful quote.
            2. DO NOT create separate units for standalone citations like "(Nelson, 2020)".
            3. Keep citations attached to the text they reference.
            4. Return ONLY a JSON array of strings.
            Text: ${text.slice(0, 10000)}
        `;

        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const result = await proModel.generateContent(request);
        const response = await result.response;
        const segments = JSON.parse(response.candidates[0].content.parts[0].text);
        
        const units = segments.map((s, i) => ({ id: `u${i}`, text: s, sourceId: 'upload-1'}));
        console.log(`✅ Created ${units.length} units`);
        res.json(units);
    } catch (error) {
        console.error("SEGMENTATION ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-taxonomy', async (req, res) => {
    try {
        const { rawText, contextType } = req.body;
        console.log(`--- PHASE B: Multi-Agent Taxonomy Generation (${contextType}) ---`);
        
        const dataSlice = rawText.slice(0, 15000); 

        // STEP 1: Agent A (The Primary Analyst) - Inductive discovery
        console.log("--- Agent A: Primary Analyst generating initial themes ---");
        const analystPrompt = `
            Task: Conduct an Inductive Thematic Analysis on the provided data.
            Instructions:
            1. Identify recurring concepts and specific issues mentioned in the text.
            2. Do NOT use generic labels. Be specific to this dataset.
            3. Look for "Latent Themes" (underlying ideas) rather than just "Semantic Themes".
            4. Group these findings into a hierarchy of Themes and Sub-themes.
            
            Data: ${dataSlice}
            Output: Return ONLY a JSON array of themes with 'name' and 'subThemes'.
        `;

        const analystResult = await proModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: analystPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const initialTaxonomy = analystResult.response.candidates[0].content.parts[0].text;

        // STEP 2: Agent B (The Critic) - Quality Control
        console.log("--- Agent B: Critic performing peer review ---");
        const criticPrompt = `
            Review this proposed qualitative taxonomy for the context: ${contextType}.
            Proposed Taxonomy: ${initialTaxonomy}

            CRITIQUE RULES:
            1. Redundancy Check: Are any themes overlapping? (e.g. "Cost" vs "Price").
            2. Specificity Check: Is it too generic? (e.g. "Various Issues"). Suggest data-grounded names.
            3. Logic Check: Are sub-themes relevant to their parent theme?

            Return ONLY a JSON "Review Memo": {"redundancies": [], "suggestedRenames": {}, "missingGaps": []}
        `;

        const criticResult = await proModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: criticPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const critique = criticResult.response.candidates[0].content.parts[0].text;

        // STEP 3: Final Synthesis - Analyst refines based on Critic
        console.log("--- Agent A: Finalizing themes with Expert Feedback ---");
        const finalPrompt = `
            Initial Draft: ${initialTaxonomy}
            Expert Critique: ${critique}
            
            Task: Provide the FINAL improved taxonomy. 
            Rules:
            - Assign IDs (t1, t2, etc) to themes.
            - Assign IDs (s1, s2, etc) to subthemes.
            - Ensure every subtheme has a clear "description" field.
            
            Return ONLY the final JSON array.
        `;

        const finalResult = await proModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        res.json(JSON.parse(finalResult.response.candidates[0].content.parts[0].text));
    } catch (error) {
        console.error("TAXONOMY GENERATION ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- UPDATED: SAMPLING ROUTE WITH 8-UNIT LIMIT ---
app.post('/api/generate-sample-coding', async (req, res) => {
    try {
      const { units, themes, mode } = req.body;
      let selectedUnits = [];
      const normalize = (id) => String(id || '').toLowerCase().replace(/[^0-9]/g, '');

      if (mode === 'comprehensive') {
        console.log("--- Mode: Comprehensive (Logprob Grid Hunter) ---");
        const poolSize = Math.min(units.length, 50); 
        const silentPrompt = `Code these units. Return ONLY JSON array. Format: [{"unitId": "u0", "themeId": "t1", "subThemeId": "s1"}]\nData: ${JSON.stringify(units.slice(0, poolSize))}\nThemes: ${JSON.stringify(themes)}`;
  
        const result = await proModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: silentPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
        const rawOutput = JSON.parse(result.response.candidates[0].content.parts[0].text);
        
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
  
      // --- FINAL CODING PASS ---
      const finalPrompt = `Provide coding. Return ONLY JSON array. Format: [{"unitId": "u0", "themeId": "t1", "subThemeId": "s1", "reasoning": "..."}]\nData: ${JSON.stringify(selectedUnits)}\nThemes: ${JSON.stringify(themes)}`;
      const finalResult = await flashModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const aiTags = JSON.parse(finalResult.response.candidates[0].content.parts[0].text);
      
      // DEBUG: Look at your terminal! This shows what the AI actually sent.
      console.log("DEBUG: AI raw output keys:", Object.keys(aiTags[0] || {}));

      const finalizedSamples = aiTags.map(tag => {
        // AGGRESSIVE KEY MATCHING: Look for unitId, then id, then uId
        const foundId = tag.unitId || tag.id || tag.uId || tag.unit_id;
        const match = selectedUnits.find(u => normalize(u.id) === normalize(foundId));
        
        return {
            ...tag,
            unitId: match ? match.id : (foundId || "unknown"), 
            themeId: tag.themeId || tag.theme_id || "", // Ensure themes don't go blank
            subThemeId: tag.subThemeId || tag.sub_theme_id || "", 
            text: match ? match.text : `Text lost - AI returned ID "${foundId}" which we couldn't find in our set.`
        };
      });

      res.json(finalizedSamples);
    } catch (error) {
      console.error("SAMPLER ERROR:", error);
      res.status(500).json({ error: error.message });
    }
});

app.post('/api/bulk-analysis', async (req, res) => {
    try {
      const { units, themes, corrections } = req.body;
      console.log(`--- PHASE B: Bulk Analysis with Critic Consensus (${units.length} units) ---`);
  
      // 1. Prepare the Calibration Rules (from Task 3)
      const expertRules = corrections.map(c => 
        `Expert Rule: "${c.text}" -> Theme: ${c.correctedThemeId}`
      ).join('\n');
  
      // 2. Primary Analyst Pass
      const analystPrompt = `
        Apply these rules: ${expertRules}
        Categorize these units into the provided taxonomy.
        Return ONLY a JSON array: [{"unitId": "u0", "themeId": "t1", "subThemeId": "s1", "reasoning": "..."}]
        
        Data: ${JSON.stringify(units)}
        Taxonomy: ${JSON.stringify(themes)}
      `;
  
      const analystResult = await flashModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: analystPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const primaryTags = JSON.parse(analystResult.response.candidates[0].content.parts[0].text);
  
      // 3. Critic Pass (The Peer Review)
      console.log("--- Critic Agent: Verifying Analyst results ---");
      const criticPrompt = `
        Review these classifications. Do they accurately reflect the data?
        Classifications: ${JSON.stringify(primaryTags)}
        Taxonomy: ${JSON.stringify(themes)}
  
        Rule: If the theme chosen doesn't fit the segment perfectly, flag it.
        Return ONLY a JSON array of boolean "agreements": [{"unitId": "u0", "agree": true, "suggestedThemeId": null}]
      `;
  
      const criticResult = await flashModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: criticPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const consensus = JSON.parse(criticResult.response.candidates[0].content.parts[0].text);
  
      // 4. Final Synthesis & Confidence Score Generation
        const finalizedResults = primaryTags.map(tag => {
            const peerReview = consensus.find(c => String(c.unitId) === String(tag.unitId));
            const originalUnit = units.find(u => String(u.id) === String(tag.unitId));
            
            // STABLE MATH: Ensure these are actual numbers, not strings
            let calculatedConfidence = 0.85; 
            if (peerReview && peerReview.agree === true) calculatedConfidence = 0.98;
            if (peerReview && peerReview.agree === false) calculatedConfidence = 0.45;
    
            return {
            ...tag,
            text: originalUnit ? originalUnit.text : "Observation context lost",
            // Force conversion to a float to prevent NaN in the frontend
            confidence: parseFloat(calculatedConfidence) || 0.85, 
            peerValidated: !!(peerReview && peerReview.agree)
            };
      });
  
      res.json(finalizedResults);
    } catch (error) {
      console.error("BULK ANALYSIS ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  });

app.post('/api/generate-narrative', async (req, res) => {
  try {
    const { units, themes } = req.body;
    console.log("--- GENERATING NARRATIVE ---");

    const prompt = `
      Task: Write a professional research summary based on the following analyzed data.
      
      Instructions:
      1. Identify the most significant trends.
      2. Mention specific themes and sub-themes by name.
      3. Use a formal, academic tone.
      4. Keep it to 3-4 concise paragraphs.

      Themes Used: ${JSON.stringify(themes)}
      Analyzed Data: ${JSON.stringify(units.slice(0, 50))} 
      
      Return the narrative as a plain text string.
    `;

    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    const result = await proModel.generateContent(request);
    const response = await result.response;
    const narrativeText = response.candidates[0].content.parts[0].text;

    res.json({ text: narrativeText });
  } catch (error) {
    console.error("Narrative Error:", error);
    res.status(500).json({ error: "Failed to generate narrative." });
  }
});

// --- DEPLOYMENT CONFIGURATION ---

// 1. Set the port (Google Cloud Run provides this via environment variable)
const port = process.env.PORT || 8080;

// 2. Serve the static files from your React build (the 'dist' folder)
app.use(express.static(path.join(__dirname, 'dist'))); 

// 3. The Express 5 "Catch-All" logic
app.get('/*path', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: "API Route Not Found" });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 4. Start the engine
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 QualiSight LIVE on port ${port}`);
}); // <--- ADD THIS LINE (The missing closing brackets)