export enum AppPhase {
  INGESTION = 1,
  TAXONOMY = 2,
  SAMPLING = 3,
  ANALYSIS = 4,
}

export enum ContextType {
  INTERVIEW = 'Interview Transcripts',
  OBSERVATION = 'Field Notes/Observations',
  LECTURE = 'Lecture/Monologue',
  SURVEY = 'Open-ended Survey Responses',
}

export interface SubTheme {
  id: string;
  name: string;
  description: string;
}

export interface Theme {
  id: string;
  name: string;
  subThemes: SubTheme[];
}

export interface DataUnit {
  id: string;
  text: string;
  sourceId?: string;
  timestamp?: string;
  speaker?: string;
}

export interface CodedUnit extends DataUnit {
  themeId: string;
  subThemeId: string;
  confidence: number;
  rationale?: string; // Why AI chose this
}

export interface SampleCorrection {
  unitId: string;
  originalThemeId: string;
  originalSubThemeId: string;
  correctedThemeId: string;
  correctedSubThemeId: string;
}

export interface AnalysisResult {
  codedUnits: CodedUnit[];
  narrative: string;
  themeCounts: Record<string, number>;
  subThemeCounts: Record<string, number>;
}
