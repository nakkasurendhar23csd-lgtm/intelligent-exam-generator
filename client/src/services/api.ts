import {
  User,
  DocumentItem,
  DocumentChunk,
  Question,
  ExaminationPaper,
  DashboardStats,
  AuditLogItem,
  SystemStats
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async register(data: { name: string; email: string; password: string; role?: string; department?: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Documents
  async getDocuments(subject?: string): Promise<{ documents: DocumentItem[] }> {
    const url = subject ? `${API_BASE}/documents?subject=${encodeURIComponent(subject)}` : `${API_BASE}/documents`;
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async getDocument(id: string): Promise<{ document: DocumentItem; chunks: DocumentChunk[] }> {
    const res = await fetch(`${API_BASE}/documents/${id}`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async uploadDocument(formData: FormData): Promise<{ message: string; document: DocumentItem }> {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    return handleResponse(res);
  },

  async deleteDocument(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async reindexDocument(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/documents/${id}/reindex`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Questions
  async generateQuestions(params: {
    subject_name: string;
    subject_code?: string;
    unit?: string;
    count?: number;
    question_type?: string;
    marks?: number;
    difficulty?: string;
    blooms_level?: string;
  }): Promise<{
    message: string;
    generatedCount: number;
    retrievedChunksCount: number;
    retrievedChunks: Array<{ id: string; unit: string; chunkIndex: number; similarity: number; excerpt: string }>;
    questions: Question[];
  }> {
    const res = await fetch(`${API_BASE}/questions/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(params)
    });
    return handleResponse(res);
  },

  async getQuestions(filters: Record<string, string | number | boolean | undefined>): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    questions: Question[];
  }> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '') {
        q.append(k, String(v));
      }
    }
    const res = await fetch(`${API_BASE}/questions?${q.toString()}`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async getQuestionStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/questions/stats`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async getQuestion(id: string): Promise<{ question: Question }> {
    const res = await fetch(`${API_BASE}/questions/${id}`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<{ message: string; question: Question }> {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  async approveQuestion(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/questions/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async rejectQuestion(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/questions/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async deleteQuestion(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async analyzeSimilarity(data: {
    question_text: string;
    subject_name?: string;
    compare_to_text?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/analyze-similarity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async similarityMatrix(questions: Array<string | Question>): Promise<{
    matrix: number[][];
    duplicatePairs: Array<{
      indexA: number;
      indexB: number;
      questionA: string;
      questionB: string;
      score: number;
      percentage: number;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/questions/similarity-matrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ questions })
    });
    return handleResponse(res);
  },

  // Exams
  async assembleExamPaper(data: {
    title: string;
    subject_name: string;
    subject_code?: string;
    course_semester?: string;
    academic_year?: string;
    duration_minutes: number;
    max_marks: number;
    instructions?: string;
    sections: Array<{
      name: string;
      description?: string;
      marksPerQuestion: number;
      count: number;
      questionType?: string;
    }>;
    difficulty_distribution?: Record<string, number>;
    blooms_distribution?: Record<string, number>;
  }): Promise<{ message: string; paper: ExaminationPaper }> {
    const res = await fetch(`${API_BASE}/exams/assemble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getExamPapers(): Promise<{ papers: ExaminationPaper[] }> {
    const res = await fetch(`${API_BASE}/exams`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async getExamPaper(id: string): Promise<{ paper: ExaminationPaper }> {
    const res = await fetch(`${API_BASE}/exams/${id}`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async updateExamPaper(id: string, updates: Partial<ExaminationPaper>): Promise<{ message: string; paper: ExaminationPaper }> {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  async deleteExamPaper(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Export URLs with auth token
  getExamPdfUrl(id: string): string {
    const token = localStorage.getItem('token');
    return `${API_BASE}/exams/${id}/export/pdf?token=${token}`;
  },

  getExamDocxUrl(id: string): string {
    const token = localStorage.getItem('token');
    return `${API_BASE}/exams/${id}/export/docx?token=${token}`;
  },

  getAnswerKeyPdfUrl(id: string): string {
    const token = localStorage.getItem('token');
    return `${API_BASE}/exams/${id}/export/answer-key-pdf?token=${token}`;
  },

  getAnswerKeyDocxUrl(id: string): string {
    const token = localStorage.getItem('token');
    return `${API_BASE}/exams/${id}/export/answer-key-docx?token=${token}`;
  },

  async downloadExamFile(url: string, filename: string): Promise<void> {
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('File download failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Admin
  async getAdminUsers(): Promise<{ users: User[] }> {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async createAdminUser(data: { name: string; email: string; password: string; role: string; department?: string }): Promise<{ message: string; user: User }> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUserRole(id: string, role: string, department?: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ role, department })
    });
    return handleResponse(res);
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async getAuditLogs(limit = 50): Promise<{ logs: AuditLogItem[] }> {
    const res = await fetch(`${API_BASE}/admin/audit-logs?limit=${limit}`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async getSystemStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/admin/system-stats`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  // Settings
  async getSettings(): Promise<{ settings: Record<string, any> }> {
    const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeader() });
    return handleResponse(res);
  },

  async saveSettings(data: Record<string, any>): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async testKey(provider: 'gemini' | 'openai', apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/settings/test-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ provider, apiKey })
    });
    return handleResponse(res);
  }
};
