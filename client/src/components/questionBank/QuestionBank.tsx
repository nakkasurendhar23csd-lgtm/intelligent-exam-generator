import React, { useState, useEffect } from 'react';
import { Question, DifficultyLevel, BloomsLevel, QuestionType } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Database,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Eye,
  BookOpen,
  Sparkles,
  Layers,
  Check,
  X,
  RefreshCw,
  Plus,
  AlertTriangle
} from 'lucide-react';

export const QuestionBank: React.FC<{ onNavigateToExam?: () => void }> = ({ onNavigateToExam }) => {
  const { success, error, warning } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [bloomsLevel, setBloomsLevel] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [status, setStatus] = useState('');
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);

  // Modals
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [search, subject, unit, difficulty, bloomsLevel, questionType, status, duplicatesOnly]);

  async function loadQuestions() {
    setLoading(true);
    try {
      const res = await api.getQuestions({
        search: search || undefined,
        subject: subject || undefined,
        unit: unit || undefined,
        difficulty: difficulty || undefined,
        blooms_level: bloomsLevel || undefined,
        question_type: questionType || undefined,
        status: status || undefined,
        is_duplicate: duplicatesOnly ? 1 : undefined,
        limit: 100
      });
      setQuestions(res.questions);
      setTotal(res.total);
    } catch (err: any) {
      error(err.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.approveQuestion(id);
      success('Question approved.');
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'approved' } : q));
    } catch (err: any) {
      error(err.message || 'Approval failed');
    }
  }

  async function handleReject(id: string) {
    try {
      await api.rejectQuestion(id);
      warning('Question rejected.');
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'rejected' } : q));
    } catch (err: any) {
      error(err.message || 'Rejection failed');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.deleteQuestion(id);
      success('Question deleted from bank.');
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (selectedQuestion?.id === id) setSelectedQuestion(null);
      if (editingQuestion?.id === id) setEditingQuestion(null);
    } catch (err: any) {
      error(err.message || 'Delete failed');
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      const res = await api.updateQuestion(editingQuestion.id, {
        question_text: editingQuestion.question_text,
        marks: editingQuestion.marks,
        difficulty: editingQuestion.difficulty,
        blooms_level: editingQuestion.blooms_level,
        model_answer: editingQuestion.model_answer,
        explanation: editingQuestion.explanation,
        status: editingQuestion.status
      });
      success('Question updated successfully.');
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...res.question } : q));
      setEditingQuestion(null);
    } catch (err: any) {
      error(err.message || 'Update failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Module 8: Centralized Academic Question Bank
            </div>
            <h1 className="text-xl font-bold text-slate-900">Curriculum Question Repository</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Search, filter, review, edit, approve, and curate grounded examination questions.
              Only approved questions without semantic duplicates are eligible for automated examination paper assembly.
            </p>
          </div>

          {onNavigateToExam && (
            <button
              onClick={onNavigateToExam}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-sm transition"
            >
              Assemble Examination Paper
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search question text, model answers, keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Difficulty Levels</option>
              <option value="Easy">Easy (Recall)</option>
              <option value="Medium">Medium (Application)</option>
              <option value="Hard">Hard (Synthesis)</option>
            </select>
          </div>

          {/* Bloom's Level Filter */}
          <div>
            <select
              value={bloomsLevel}
              onChange={e => setBloomsLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Bloom's Tiers</option>
              <option value="Remember">Remember (L1)</option>
              <option value="Understand">Understand (L2)</option>
              <option value="Apply">Apply (L3)</option>
              <option value="Analyze">Analyze (L4)</option>
              <option value="Evaluate">Evaluate (L5)</option>
              <option value="Create">Create (L6)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Question Type Filter */}
            <select
              value={questionType}
              onChange={e => setQuestionType(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
            >
              <option value="">All Question Types</option>
              <option value="mcq">MCQ</option>
              <option value="short">Short Answer</option>
              <option value="long">Long Answer</option>
              <option value="descriptive">Descriptive</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Duplicates Only Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold select-none">
              <input
                type="checkbox"
                checked={duplicatesOnly}
                onChange={e => setDuplicatesOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Duplicates Only
              </span>
            </label>
          </div>

          <div className="text-slate-500">
            Showing <strong className="text-slate-800">{questions.length}</strong> of {total} questions
          </div>
        </div>
      </div>

      {/* Questions Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading Question Bank records...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Database className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No matching questions found.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the search filters or generate new questions.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questions.map((q, idx) => {
              const diffColors = {
                Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                Medium: 'bg-blue-50 text-blue-700 border-blue-200',
                Hard: 'bg-rose-50 text-rose-700 border-rose-200'
              };

              const statusColors = {
                approved: 'bg-emerald-100 text-emerald-800',
                draft: 'bg-slate-100 text-slate-700',
                rejected: 'bg-rose-100 text-rose-800'
              };

              return (
                <div key={q.id} className="p-4 hover:bg-slate-50/80 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border">
                        {q.question_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${diffColors[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {q.blooms_level}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {q.marks} Marks
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[q.status]}`}>
                        {q.status}
                      </span>
                      {q.is_duplicate && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Duplicate ({Math.round((q.duplicate_score || 0.8) * 100)}%)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedQuestion(q)}
                        title="View Full Question Details"
                        className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingQuestion(q)}
                        title="Edit Question"
                        className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {q.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(q.id)}
                          title="Approve Question"
                          className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {q.status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(q.id)}
                          title="Reject Question"
                          className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(q.id)}
                        title="Delete Question"
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {q.question_text}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      <strong className="text-slate-700">{q.subject_name}</strong> • {q.unit}
                    </span>
                    {q.source_reference && (
                      <span className="truncate max-w-sm italic">
                        Ref: {q.source_reference}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Question Details Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Question Details & Academic Metadata
              </h3>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Question Prompt</span>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedQuestion.question_text}
                </p>
              </div>

              {selectedQuestion.options && Array.isArray(selectedQuestion.options) && (
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Multiple Choice Options</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {selectedQuestion.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border text-xs ${
                          selectedQuestion.correct_answer && opt.includes(`(${selectedQuestion.correct_answer})`)
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuestion.model_answer && (
                <div>
                  <span className="font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                    Official Model Answer / Solution
                  </span>
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-slate-800 font-mono whitespace-pre-line leading-relaxed">
                    {selectedQuestion.model_answer}
                  </div>
                </div>
              )}

              {selectedQuestion.explanation && (
                <div>
                  <span className="font-bold text-blue-800 uppercase tracking-wider block mb-1">
                    Pedagogical Explanation
                  </span>
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 text-slate-700 leading-relaxed">
                    {selectedQuestion.explanation}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Marks</span>
                  <span className="text-sm font-bold text-slate-900">{selectedQuestion.marks}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Difficulty</span>
                  <span className="text-sm font-bold text-slate-900">{selectedQuestion.difficulty}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Bloom's Tier</span>
                  <span className="text-sm font-bold text-slate-900">{selectedQuestion.blooms_level}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                  <span className="text-sm font-bold text-slate-900 uppercase">{selectedQuestion.status}</span>
                </div>
              </div>

              {selectedQuestion.source_reference && (
                <div className="p-2.5 bg-slate-50 rounded-lg border text-[11px] text-slate-600 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Source Citation:</strong> {selectedQuestion.source_reference}</span>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedQuestion(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Edit Question & Calibrate Difficulty
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Question Text</label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={e => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  rows={3}
                  required
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editingQuestion.marks}
                    onChange={e => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloom's Tier</label>
                  <select
                    value={editingQuestion.blooms_level}
                    onChange={e => setEditingQuestion({ ...editingQuestion, blooms_level: e.target.value as any })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Remember">Remember</option>
                    <option value="Understand">Understand</option>
                    <option value="Apply">Apply</option>
                    <option value="Analyze">Analyze</option>
                    <option value="Evaluate">Evaluate</option>
                    <option value="Create">Create</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Model Answer / Solution</label>
                <textarea
                  value={editingQuestion.model_answer || ''}
                  onChange={e => setEditingQuestion({ ...editingQuestion, model_answer: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Explanation</label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
