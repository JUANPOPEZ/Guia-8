export type StudentLevel = 'principiante' | 'intermedio' | 'avanzado';

export type ProgrammingLanguage =
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'cpp'
  | 'sql'
  | 'rust';

export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
}

export interface StructuredExplanation {
  topic: string;
  isInsufficientInfo: boolean;
  insufficientInfoNotice: string;
  definition: string;
  explanation: string;
  steps: string[];
  example: CodeExample;
  practicalRecommendation: string;
  verificationWarning: string;
  relatedConcepts: string[];
  verifiedReferences?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structuredData?: StructuredExplanation;
  timestamp: number;
}

export interface ChallengeOption {
  id: string;
  text: string;
  explanation: string;
}

export interface AcademicChallenge {
  title: string;
  scenario: string;
  codeSnippet?: string;
  language?: string;
  question: string;
  options: ChallengeOption[];
  correctOptionId: string;
  academicFeedback: string;
  verificationWarning: string;
}

export interface CurriculumTopic {
  id: string;
  title: string;
  icon: string;
  category: string;
  description: string;
  concepts: {
    name: string;
    description: string;
    query: string;
    difficulty: StudentLevel;
  }[];
}

export type UserRole = 'ADMIN' | 'USER';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
    displayName: string;
  };
}

export interface AuditLogEntry {
  timestamp: string;
  method: string;
  path: string;
  role: string;
  statusCode: number;
  durationMs: number;
}

export interface AdminMetrics {
  uptimeSeconds: number;
  totalRequests: number;
  requestsByRole: {
    ADMIN: number;
    USER: number;
    ANONYMOUS: number;
  };
  securityEvents: {
    unauthorized401: number;
    forbidden403: number;
    rateLimited429: number;
    loginSuccess: number;
    loginFailure: number;
  };
  endpointHits: Record<string, number>;
  recentAuditLogs: AuditLogEntry[];
}

