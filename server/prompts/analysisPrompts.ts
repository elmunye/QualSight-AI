import { Theme, DataUnit, CodedUnit } from '../../types';

export const bulkAnalystPrompt = (themes: Theme[], units: DataUnit[], fewShotExamples: string) => `
    ### Role
    You are a Production Qualitative Analyst. You are scaling a thematic analysis across a large dataset.

    ### Inputs
    1. **The Taxonomy (Codebook):** 
    ${JSON.stringify(themes.map((t, i) => ({
        index: i,
        name: t.name,
        description: t.description,
        subThemes: t.subThemes.map((s, j) => ({
            subIndex: j,
            name: s.name,
            description: s.description
        }))
    })), null, 2)}

    2. **Gold Standard Examples (USER VALIDATED - FOLLOW THESE STRICTLY):**
       ${fewShotExamples}

    3. **Data to Analyze:** ${JSON.stringify(units)}

    ### Task
    Code the "Data to Analyze" using the Taxonomy. Assign a theme and subtheme to *every* unit (no nulls). 
    
    **CRITICAL: Use Array Indices for IDs.**
    - Instead of "themeId", return "themeIndex" (integer).
    - Instead of "subThemeId", return "subThemeIndex" (integer).

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
        "themeIndex": 0,
        "subThemeIndex": 2,
        "strictFit": true,
        "reasoning": "Similar to Gold Standard example regarding 'server latency'."
      }
    ]
    (strictFit: true when clear match; strictFit: false when best guess only. Indices must correspond to the provided Codebook arrays.)
      `;

export const bulkCriticPrompt = (themes: Theme[], auditPayload: any[]) => `
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

export const bulkJudgePrompt = (themes: Theme[], conflicts: any[]) => `
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

export const narrativePrompt = (organizedData: any[]) => `
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

export const librarianPrompt = (themeName: string, subThemes: any[]) => `
    ### Role
    You are a Research Librarian. Your goal is to select the most "punchy" and representative quotes for a specific Theme.

    ### Theme
    **${themeName}**

    ### Sub-Themes & Candidate Quotes
    ${JSON.stringify(subThemes, null, 2)}

    ### Task
    For each Sub-Theme, select exactly 3 quotes that best capture the essence of that sub-theme.
    - **Criteria:** Clear, emotional/descriptive, and representative.
    - **Avoid:** Short/vague quotes like "Yes" or "I agree."

    ### Output
    Return ONLY a JSON array of selected quotes.
    Structure:
    [
      {
        "subThemeId": "s1-1",
        "selectedQuotes": [
          "Quote 1 text... (Unit 5)",
          "Quote 2 text... (Unit 12)",
          "Quote 3 text... (Unit 99)"
        ]
      }
    ]
`;
