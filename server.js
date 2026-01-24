import express from 'express';
import cors from 'cors';
import pkg from '@google-cloud/vertexai';
const { VertexAI } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Vertex AI
const project = 'qualisight-ai'; 
const location = 'us-central1';
const vertex_ai = new VertexAI({ project, location });

const proModel = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-pro' });
const flashModel = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
        console.log(`--- Processing Taxonomy for ${contextType} ---`);

        const prompt = `
    Task: Analyze this ${contextType} data and return a JSON taxonomy.
    Constraint: Return ONLY a JSON array.
    
    CRITICAL STRUCTURE:
    Every object MUST have exactly these keys: "id", "name", and "subThemes".
    The "subThemes" key MUST be an array, even if empty.
    
    Example:
    [
      {
        "id": "t1",
        "name": "Example Theme",
        "subThemes": [{ "id": "s1", "name": "Subname", "description": "text" }]
      }
    ]

    Data: ${rawText.slice(0, 5000)}
`;

        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const result = await proModel.generateContent(request);
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;
        res.json(JSON.parse(text));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- UPDATED: SAMPLING ROUTE WITH 8-UNIT LIMIT ---
app.post('/api/generate-sample-coding', async (req, res) => {
  try {
      const { units, themes } = req.body;
      
      // Limit the work for the user: Pick 8 random units max
      const sampleSize = Math.min(units.length, 8);
      const shuffled = [...units].sort(() => 0.5 - Math.random());
      const selectedUnits = shuffled.slice(0, sampleSize);

      console.log(`--- Sampling ${selectedUnits.length} units from total of ${units.length} ---`);

      const prompt = `
          Task: Categorize these text segments.
          Constraint: You MUST use the EXACT "id" for themeId and subThemeId from the taxonomy provided.
          
          Themes: ${JSON.stringify(themes)}
          Data: ${JSON.stringify(selectedUnits)}
          
          Return ONLY a JSON array:
          [{ "unitId": "u0", "themeId": "t1", "subThemeId": "s1", "reasoning": "..." }]
      `;

      const request = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
      };

      const result = await flashModel.generateContent(request);
      const response = await result.response;
      const aiTags = JSON.parse(response.candidates[0].content.parts[0].text);
      
      const codedUnits = aiTags.map(tag => {
        // We search the 'selectedUnits' list for the text that matches the ID Gemini returned
        const originalUnit = selectedUnits.find(u => String(u.id) === String(tag.unitId));
        
        return { 
            ...tag, 
            // If Gemini returned a theme but the ID doesn't match, we fallback to a safety check
            text: originalUnit ? originalUnit.text : (selectedUnits[0]?.text || "Text truly missing")
        };
      });

      res.json(codedUnits);
  } catch (error) {
      console.error("SAMPLER ERROR:", error);
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/bulk-analysis', async (req, res) => {
  try {
      const { units, themes, corrections } = req.body;
      console.log(`--- BULK ANALYSIS: Processing ${units.length} units ---`);

      const prompt = `
          Task: Categorize ALL text segments based on these themes.
          
          Logic Instructions: 
          Apply these User Corrections: ${JSON.stringify(corrections)}

          Return ONLY a JSON array of objects with these keys:
          - unitId: The EXACT id from the data provided (e.g., "u0")
          - themeId: The theme ID
          - subThemeId: The sub-theme ID
          - reasoning: Brief explanation
          - confidence: A number between 0 and 1 (e.g., 0.95)

          Themes: ${JSON.stringify(themes)}
          Data: ${JSON.stringify(units)}
      `;

      const request = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
      };

      const result = await flashModel.generateContent(request);
      const response = await result.response;
      const aiTags = JSON.parse(response.candidates[0].content.parts[0].text);

      // --- THE EXPERT FIX: Rigid Text Mapping ---
      const finalizedData = aiTags.map(tag => {
          // We search the 'units' batch we just sent for the matching ID
          const originalUnit = units.find(u => String(u.id) === String(tag.unitId));
          
          return {
              ...tag,
              // Fallback to avoid "Text missing"
              text: originalUnit ? originalUnit.text : "Observation content lost during mapping",
              // Ensure confidence is a number for the NaN fix
              confidence: tag.confidence || 0.85 
          };
      });

      console.log(`✅ Batch of ${finalizedData.length} units processed`);
      res.json(finalizedData);
  } catch (error) {
      console.error("❌ BULK ERROR:", error);
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

app.listen(3001, () => console.log('🚀 Bridge Server active on http://localhost:3001'));