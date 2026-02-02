import { buildEditablePromptTemplate } from '../prompts/taxonomyPrompts.js';

export const getPromptTemplate = (purpose: string) => {
    return buildEditablePromptTemplate(purpose);
}
