export enum AppPhase {
  INGESTION = 1,
  TAXONOMY = 2,
  SAMPLING_SELECTION = 3,
  SAMPLING = 4,
  ANALYSIS = 5,
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
  unitId?: string; // API often returns unitId; same as id for a coded unit
  themeId: string;
  subThemeId: string;
  confidence: number;
  rationale?: string; // Why AI chose this (sample phase)
  reasoning?: string; // Same as rationale (bulk/sample API returns "reasoning")
  peerValidated?: boolean;
  /** When false, the coder flagged this as no strict fit (best guess only). User should review. */
  strictFit?: boolean;
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
