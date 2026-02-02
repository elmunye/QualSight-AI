export const DEFAULT_ANALYST_PURPOSE = 'support interpretation and reporting of key themes';

/** Server-only: fixed suffix (validity check + input data + output format). Not shown in UI. */
export function getAnalystPromptFixedSuffix(dataSlice: string) {
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

/** User-editable part only: Role, Task, Rules. Shown in UI. No validity check, no input data, no output format. */
export function buildEditablePromptTemplate(purpose: string) {
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

/** Full prompt for Step 2a when no custom prompt is provided. Contains {{DATA}} for later replacement. */
export function buildAnalystPromptTemplate(purpose: string) {
    const editable = buildEditablePromptTemplate(purpose);
    return editable + '\n\n' + getAnalystPromptFixedSuffix('{{DATA}}');
}

export const criticPrompt = (ctx: string, initialTaxonomy: string) => `
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

export const finalPrompt = (ctx: string, initialTaxonomy: string, critique: string) => `
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
