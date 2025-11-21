export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  error?: string;
}

export interface ChatSessionConfig {
  apiKey: string;
  model: string;
}