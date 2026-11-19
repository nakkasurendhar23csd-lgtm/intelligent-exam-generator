export type UserRole = 'faculty' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  created_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id?: string;
  unit: string;
  chunk_index: number;
  token_count: number;
  content: string;
  similarity?: number;
  created_at?: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  subject_name: string;
  subject_code: string;
  course_semester: string;
  academic_year: string;
  units: string[];
  original_filename: string;
  file_type: string;
  file_size: number;
  extracted_text?: string;
  chunk_count: number;
  status: 'uploaded' | 'processing' | 'indexed' | 'error';
  error_message?: string;
  created_at: string;
}

export type QuestionType = 'mcq' | 'short' | 'long' | 'descriptive';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type BloomsLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';

export interface Question {
  id: string;
  user_id?: string;
  document_id?: string;
  subject_name: string;
  subject_code?: string;
  unit: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[] | null;
  correct_answer?: string | null;
  model_answer?: string | null;
  explanation?: string | null;
  marks: number;
  difficulty: DifficultyLevel;
  blooms_level: BloomsLevel;
  blooms_justification?: string;
  source_reference?: string;
  source_chunk_id?: string;
  status: 'approved' | 'draft' | 'rejected';
  duplicate_of_id?: string | null;
  duplicate_score?: number;
  duplicate_notes?: string | null;
  is_duplicate?: boolean;
  created_at?: string;
}

export interface ExamSection {
  name: string;
  description?: string;
  marksPerQuestion: number;
  targetCount: number;
  questions: Question[];
}

export interface ExamPaperStats {
  totalQuestions: number;
  calculatedTotalMarks: number;
  targetMaxMarks: number;
  difficultyDistribution: Record<DifficultyLevel, number>;
  bloomsDistribution: Record<BloomsLevel, number>;
  unitDistribution: Record<string, number>;
}

export interface ExaminationPaper {
  id: string;
  user_id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  course_semester?: string;
  academic_year?: string;
  duration_minutes: number;
  max_marks: number;
  instructions?: string;
  sections?: ExamSection[];
  questions?: Question[];
  blueprint?: {
    sections: ExamSection[];
    difficultyDistribution?: Record<string, number>;
    bloomsDistribution?: Record<string, number>;
    stats?: ExamPaperStats;
  };
  stats?: ExamPaperStats;
  calculatedTotalMarks?: number;
  questionCount?: number;
  status: 'draft' | 'approved' | 'final';
  created_at: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  totalDocuments: number;
  totalQuestions: number;
  approvedQuestions: number;
  duplicateQuestions: number;
  totalPapers: number;
}

export interface DashboardStats {
  metrics: DashboardMetrics;
  difficultyDistribution: Record<DifficultyLevel, number>;
  bloomsDistribution: Record<BloomsLevel, number>;
  unitDistribution: Array<{ unit: string; count: number }>;
  subjectDistribution: Array<{ subject_name: string; count: number }>;
}

export interface AuditLogItem {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface SystemStats {
  users: number;
  documents: number;
  vectorChunks: number;
  questions: number;
  examinationPapers: number;
  auditLogs: number;
  serverUptime: number;
  nodeVersion: string;
  platform: string;
  databaseEngine: string;
}
