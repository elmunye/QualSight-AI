import { Theme, DataUnit, CodedUnit } from '../../types';

export const selectorPrompt = (themes: Theme[], units: DataUnit[]) => `
    ### Role
    You are a Data Curator. Your goal is to select a diverse set of "Representative Examples" from the provided Data Pool to verify a new Codebook.

    ### Input
    1. **Codebook:** ${JSON.stringify(themes)}
    2. **Data Pool:** ${JSON.stringify(units.map((u, i) => ({ index: i, ...u })))}

    ### Task
    Scan the Data Pool and identify the *single best* text segment that exemplifies each Sub-theme in the Codebook.

    ### Selection Criteria
    1. **Clarity:** The selected text must clearly match the definition of the sub-theme.
    2. **Diversity:** Try to find at least one unique unit for every sub-theme available in the pool.
    3. **Constraint:** If no unit fits a specific sub-theme, do not force a selection for it.

    ### Output
    Return ONLY a JSON array of objects connecting a unit to a theme.
    **CRITICAL: Use the 'index' from the Data Pool.**

    Format: [{"unitIndex": 12, "themeId": "t1", "subThemeId": "s1-1"}]
    `;

export const sampleCoderPrompt = (themes: Theme[], selectedUnits: DataUnit[]) => `
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
