import React, { useState, useEffect } from 'react';
import { Question, DocumentItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Cpu,
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit3,
  Trash2,
  Save,
  Check,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';

export const QuestionGenerator: React.FC<{ onNavigateToBank?: () => void }> = ({ onNavigateToBank }) => {
  const { success, error, warning, info } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('Cloud Computing & Distributed Systems');
  const [selectedUnit, setSelectedUnit] = useState('All Units');
  const [count, setCount] = useState<number>(3);
  const [questionType, setQuestionType] = useState<'mcq' | 'short' | 'long' | 'descriptive'>('short');
  const [marks, setMarks] = useState<number>(2);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [bloomsLevel, setBloomsLevel] = useState<'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create'>('Understand');

  // Generation status and results
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [retrievedChunks, setRetrievedChunks] = useState<Array<{ id: string; unit: string; chunkIndex: number; similarity: number; excerpt: string }>>([]);
  const [showRAGContext, setShowRAGContext] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editMarks, setEditMarks] = useState(2);
  const [editDiff, setEditDiff] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [editBlooms, setEditBlooms] = useState<'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create'>('Understand');

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
      if (res.documents.length > 0 && !res.documents.some(d => d.subject_name === selectedSubject)) {
        setSelectedSubject(res.documents[0].subject_name);
      }
    } catch {
      // ignore
    }
  }

  // Get available units for the selected subject
  const currentDoc = documents.find(d => d.subject_name === selectedSubject);
  const availableUnits = currentDoc ? currentDoc.units : [
    'Unit 1: Cloud Architecture & Service Models',
    'Unit 2: Virtualization & Hypervisor Architecture',
    'Unit 3: Distributed Storage & MapReduce',
    'Unit 4: Cloud Security & Governance',
    'Unit 5: Serverless Computing & Microservices'
  ];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGeneratedQuestions([]);
    setRetrievedChunks([]);
    info(`Retrieving relevant syllabus chunks and generating ${count} grounded questions...`);

    try {
      const res = await api.generateQuestions({
        subject_name: selectedSubject,
        subject_code: currentDoc?.subject_code || '',
        unit: selectedUnit === 'All Units' ? undefined : selectedUnit,
        count,
        question_type: questionType,
        marks,
        difficulty,
        blooms_level: bloomsLevel
      });

      setGeneratedQuestions(res.questions);
      setRetrievedChunks(res.retrievedChunks || []);

      const duplicates = res.questions.filter(q => q.is_duplicate);
      if (duplicates.length > 0) {
        warning(`Generated ${res.generatedCount} questions, but detected ${duplicates.length} semantic conceptual near-duplicate(s). Review recommendations below.`);
      } else {
        success(`Generated ${res.generatedCount} grounded questions strictly aligned with syllabus materials!`);
      }
    } catch (err: any) {
      error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // Edit action
  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditText(q.question_text);
    setEditMarks(q.marks);
    setEditDiff(q.difficulty);
    setEditBlooms(q.blooms_level);
  }

  async function saveEdit(id: string) {
    try {
      const res = await api.updateQuestion(id, {
        question_text: editText,
        marks: editMarks,
        difficulty: editDiff,
        blooms_level: editBlooms
      });
      setGeneratedQuestions(prev => prev.map(q => q.id === id ? { ...q, ...res.question } : q));
      setEditingId(null);
      success('Question updated successfully.');
    } catch (err: any) {
      error(err.message || 'Update failed');
    }
  }

  async function removeQuestion(id: string) {
    try {
      await api.deleteQuestion(id);
      setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
      success('Question removed from candidate set.');
    } catch (err: any) {
      error(err.message || 'Failed to remove question');
    }
  }

  async function retainQuestion(id: string) {
    try {
      await api.approveQuestion(id);
      setGeneratedQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'approved', is_duplicate: false } : q));
      success('Question approved and retained in Question Bank.');
    } catch (err: any) {
      error(err.message || 'Approval failed');
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
              Module 3, 4, 6 & 7: RAG Question Generation & Bloom's Calibration
            </div>
            <h1 className="text-xl font-bold text-slate-900">AI-Based Question Generation</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Questions are synthesized strictly from retrieved academic text chunks, guaranteeing syllabus alignment.
              Each question is categorized by Bloom's Taxonomy cognitive tier, assigned psychometric difficulty,
              and checked for conceptual duplication against the Question Bank.
            </p>
          </div>
          {onNavigateToBank && (
            <button
              onClick={onNavigateToBank}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 self-start md:self-auto transition"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              View Question Bank
            </button>
          )}
        </div>
      </div>

      {/* Generator Configuration Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-600" />
          Question Generation Blueprint
        </h2>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Subject *</label>
              <select
                value={selectedSubject}
                onChange={e => {
                  setSelectedSubject(e.target.value);
                  setSelectedUnit('All Units');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                {documents.length > 0 ? (
                  documents.map(d => (
                    <option key={d.id} value={d.subject_name}>
                      {d.subject_name} ({d.subject_code || 'No Code'})
                    </option>
                  ))
                ) : (
                  <option value="Cloud Computing & Distributed Systems">Cloud Computing & Distributed Systems (CS8041)</option>
                )}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Syllabus Unit</label>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="All Units">All Units (Balanced Coverage)</option>
                {availableUnits.map((u, i) => (
                  <option key={i} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Question Type</label>
              <select
                value={questionType}
                onChange={e => {
                  const val = e.target.value as any;
                  setQuestionType(val);
                  if (val === 'mcq') setMarks(1);
                  else if (val === 'short') setMarks(2);
                  else if (val === 'long') setMarks(8);
                  else if (val === 'descriptive') setMarks(16);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="mcq">Multiple Choice Question (MCQ with Options)</option>
                <option value="short">Short Answer Question (2-4 Marks)</option>
                <option value="long">Long Answer Question (5-10 Marks)</option>
                <option value="descriptive">Descriptive Question (12-16 Marks)</option>
              </select>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Number of Questions ({count})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={count}
                  onChange={e => setCount(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-8 text-center font-bold text-sm text-slate-800">{count}</span>
              </div>
            </div>

            {/* Marks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marks per Question</label>
              <input
                type="number"
                min="1"
                max="25"
                value={marks}
                onChange={e => setMarks(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="Easy">Easy (Foundational Recall)</option>
                <option value="Medium">Medium (Application & Explanation)</option>
                <option value="Hard">Hard (Evaluation & Synthesis)</option>
              </select>
            </div>

            {/* Bloom's Taxonomy Level */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Bloom's Taxonomy Cognitive Tier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as const).map(tier => (
                  <button
                    type="button"
                    key={tier}
                    onClick={() => setBloomsLevel(tier)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition text-center ${
                      bloomsLevel === tier
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={generating}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition ${
                generating ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Retrieving Chunks & Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Execute RAG Generation
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RAG Context Retrieval Transparency Card */}
      {retrievedChunks.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-xs overflow-hidden">
          <div
            onClick={() => setShowRAGContext(!showRAGContext)}
            className="p-4 bg-blue-50/70 border-b border-blue-200 flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                RAG Evidence: {retrievedChunks.length} Academic Text Chunks Retrieved
              </span>
              <span className="text-xs text-blue-600">
                (Cosine Similarity Vector Match)
              </span>
            </div>
            <button className="text-xs font-bold text-blue-700 flex items-center gap-1">
              {showRAGContext ? 'Hide Source Chunks' : 'Inspect Retrieved Chunks'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showRAGContext ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showRAGContext && (
            <div className="p-4 space-y-2 bg-slate-50/50">
              {retrievedChunks.map((chunk, i) => (
                <div key={chunk.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between items-center font-semibold text-slate-700 mb-1">
                    <span className="text-blue-700">Chunk #{chunk.chunkIndex + 1} ({chunk.unit})</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                      Similarity: {(chunk.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-sans">{chunk.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generated Questions List */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Generated Grounded Questions ({generatedQuestions.length})
            </h2>
            <span className="text-xs text-slate-500">
              All questions auto-saved to Question Bank. Review, modify, or reject below.
            </span>
          </div>

          <div className="space-y-4">
            {generatedQuestions.map((q, idx) => {
              const isEditing = editingId === q.id;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs transition ${
                    q.is_duplicate
                      ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/10'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {/* Duplicate Alert Banner */}
                  {q.is_duplicate && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 flex-1">
                        <div className="font-bold flex items-center gap-2">
                          <span>Semantic Near-Duplicate Flagged</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[10px]">
                            {q.duplicate_score ? Math.round(q.duplicate_score * 100) : 85}% Conceptual Match
                          </span>
                        </div>
                        <p className="mt-1 text-amber-800 leading-relaxed">
                          {q.duplicate_notes || 'This question shares conceptual intent with an existing question in the bank. You may Retain, Edit, or Discard it.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => retainQuestion(q.id)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-xs transition"
                        >
                          Retain Anyway
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Question Header: Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Question #{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px] uppercase border border-blue-200">
                        {q.question_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {q.marks} Marks
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                        Bloom's: {q.blooms_level}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-200">
                        Level: {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <button
                          onClick={() => saveEdit(q.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(q)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Question"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Discard Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Body */}
                  <div className="pt-3 space-y-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Marks</label>
                            <input
                              type="number"
                              value={editMarks}
                              onChange={e => setEditMarks(parseInt(e.target.value, 10) || 1)}
                              className="w-full p-1.5 text-xs border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Difficulty</label>
                            <select
                              value={editDiff}
                              onChange={e => setEditDiff(e.target.value as any)}
                              className="w-full p-1.5 text-xs border rounded bg-white"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Bloom's</label>
                            <select
                              value={editBlooms}
                              onChange={e => setEditBlooms(e.target.value as any)}
                              className="w-full p-1.5 text-xs border rounded bg-white"
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
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {q.question_text}
                      </p>
                    )}

                    {/* MCQ Options */}
                    {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border text-xs font-medium ${
                              q.correct_answer && opt.includes(`(${q.correct_answer})`)
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Model Answer & Explanation Box */}
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                      {q.model_answer && (
                        <div>
                          <span className="font-bold text-emerald-800 uppercase tracking-wider block text-[10px]">
                            Model Answer / Scoring Solution
                          </span>
                          <p className="text-slate-800 font-mono mt-0.5 whitespace-pre-line leading-relaxed">
                            {q.model_answer}
                          </p>
                        </div>
                      )}
                      {q.explanation && (
                        <div>
                          <span className="font-bold text-blue-800 uppercase tracking-wider block text-[10px]">
                            Pedagogical Explanation
                          </span>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                      {q.source_reference && (
                        <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-200/60">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-slate-700">Source:</span> {q.source_reference}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
