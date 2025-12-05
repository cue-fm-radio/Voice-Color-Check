export interface ColorParameter {
  id: string;
  label: string;
  subLabel: string;
  colorCode: string; // Hex code for UI
  score: number; // 0-100
  description: string;
}

export interface AnalysisResult {
  summary: string;
  parameters: ColorParameter[];
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
