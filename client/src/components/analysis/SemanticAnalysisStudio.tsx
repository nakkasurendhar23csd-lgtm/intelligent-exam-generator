import React, { useState, useEffect } from 'react';
import { Question } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  GitCompare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  BookOpen,
  Trash2,
  Edit3,
  Check
} from 'lucide-react';

export const SemanticAnalysisStudio: React.FC = () => {
  const { success, error, warning, info } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'comparator' | 'duplicates' | 'matrix'>('comparator');

  // Pairwise comparator state
  const [questionA, setQuestionA] = useState('Define cloud computing and state its primary characteristics.');
  const [questionB, setQuestionB] = useState('What is meant by cloud computing? Mention its essential NIST features.');
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Bank duplicates state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [flaggedDuplicates, setFlaggedDuplicates] = useState<Question[]>([]);

  // Matrix state
  const [matrixResult, setMatrixResult] = useState<{
    matrix: number[][];
    duplicatePairs: Array<{
      indexA: number;
      indexB: number;
      questionA: string;
      questionB: string;
      score: number;
      percentage: number;
    }>;
  } | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    setLoadingBank(true);
    try {
      const res = await api.getQuestions({ limit: 100 });
      setQuestions(res.questions);
      setFlaggedDuplicates(res.questions.filter(q => q.is_duplicate));
    } catch {
      // ignore
    } finally {
      setLoadingBank(false);
    }
  }

  async function runPairwiseComparison() {
    if (!questionA.trim() || !questionB.trim()) {
      error('Both Question A and Question B are required for semantic comparison.');
      return;
    }

    setComparing(true);
    try {
      const res = await api.analyzeSimilarity({
        question_text: questionA,
        compare_to_text: questionB
      });
      setComparisonResult(res);
      if (res.isDuplicate) {
        warning(`High conceptual similarity detected (${res.percentage}%). Both questions target the same syllabus objective.`);
      } else {
        success(`Comparison completed: ${res.percentage}% similarity score.`);
      }
    } catch (err: any) {
      error(err.message || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  }

  async function computeMatrix() {
    if (questions.length < 2) {
      warning('At least two questions in the Question Bank are required to build a matrix.');
      return;
    }

    setLoadingMatrix(true);
    try {
      const sample = questions.slice(0, 8); // top 8 for clean visual grid
      const res = await api.similarityMatrix(sample.map(q => q.question_text));
      setMatrixResult(res);
      success(`Computed ${sample.length}x${sample.length} semantic similarity matrix.`);
    } catch (err: any) {
      error(err.message || 'Matrix computation failed');
    } finally {
      setLoadingMatrix(false);
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm('Delete this duplicate question from the Question Bank?')) return;
    try {
      await api.deleteQuestion(id);
      success('Question deleted successfully.');
      loadQuestions();
    } catch (err: any) {
      error(err.message || 'Failed to delete');
    }
  }

  async function handleRetain(id: string) {
    try {
      await api.approveQuestion(id);
      success('Question marked as retained and approved.');
      loadQuestions();
    } catch (err: any) {
      error(err.message || 'Failed to approve');
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
              Module 5: Semantic Question Analysis & Near-Duplicate Detection
            </div>
            <h1 className="text-xl font-bold text-slate-900">Semantic Question Analysis Studio</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Identify conceptually repeated questions across exams even when expressed with completely different phrasing.
              Powered by dense embedding vectors and cosine similarity rather than superficial text string matching.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('comparator')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeSubTab === 'comparator' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pairwise Comparator
            </button>
            <button
              onClick={() => setActiveSubTab('duplicates')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeSubTab === 'duplicates' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flagged Overlaps
              {flaggedDuplicates.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {flaggedDuplicates.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveSubTab('matrix');
                if (!matrixResult) computeMatrix();
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                activeSubTab === 'matrix' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Similarity Matrix
            </button>
          </div>
        </div>
      </div>

      {/* SubTab 1: Pairwise Semantic Comparator */}
      {activeSubTab === 'comparator' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-blue-600" />
                Live Conceptual Equivalence Comparator
              </h2>

              <button
                type="button"
                onClick={() => {
                  setQuestionA('Define cloud computing and list its 5 NIST characteristics.');
                  setQuestionB('What is meant by cloud computing? State the five essential features defined by NIST.');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition"
              >
                Load Cloud Computing Example
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Question A (Candidate or Existing)
                </label>
                <textarea
                  value={questionA}
                  onChange={e => setQuestionA(e.target.value)}
                  rows={4}
                  placeholder="Enter first question..."
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Question B (Comparison Candidate)
                </label>
                <textarea
                  value={questionB}
                  onChange={e => setQuestionB(e.target.value)}
                  rows={4}
                  placeholder="Enter second question..."
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={runPairwiseComparison}
                disabled={comparing}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition"
              >
                {comparing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating Cosine Distance...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4" />
                    Calculate Semantic Similarity
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Comparison Results Card */}
          {comparisonResult && (
            <div className={`bg-white rounded-xl border p-6 shadow-xs space-y-4 ${
              comparisonResult.isDuplicate
                ? 'border-amber-300 bg-amber-50/10 ring-2 ring-amber-100'
                : 'border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">Semantic Similarity Analysis</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      comparisonResult.isDuplicate
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : comparisonResult.overlapLevel === 'MODERATE'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {comparisonResult.overlapLevel} OVERLAP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Embedding vector cosine angle: {comparisonResult.score} / 1.0000
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-2xl font-black text-slate-900">
                      {comparisonResult.percentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Similarity Score</span>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center font-bold text-sm bg-slate-50">
                    <span className={comparisonResult.isDuplicate ? 'text-amber-600' : 'text-blue-600'}>
                      {comparisonResult.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Question A</span>
                  <p className="text-slate-900 font-medium leading-relaxed">{comparisonResult.questionA}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Question B</span>
                  <p className="text-slate-900 font-medium leading-relaxed">{comparisonResult.questionB}</p>
                </div>
              </div>

              {/* Pedagogical Rationale */}
              <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-blue-800">
                  Pedagogical Semantic Evaluation
                </span>
                <p className="leading-relaxed">{comparisonResult.reason}</p>
              </div>

              {comparisonResult.isDuplicate && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Examination Paper Warning:</strong> Including both questions on the same examination paper
                    violates syllabus balance criteria and results in redundant cognitive evaluation.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Flagged Question Bank Overlaps */}
      {activeSubTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Detected Near-Duplicates in Question Bank ({flaggedDuplicates.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions flagged with cosine similarity score ≥ 0.78 against another question in the bank.
              </p>
            </div>
            <button
              onClick={loadQuestions}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Scan
            </button>
          </div>

          {flaggedDuplicates.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No duplicate questions detected!</p>
              <p className="text-xs text-slate-500 mt-1">All approved questions in the Question Bank have distinct conceptual objectives.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedDuplicates.map(q => {
                const matchedQ = questions.find(item => item.id === q.duplicate_of_id);

                return (
                  <div key={q.id} className="bg-white rounded-xl border border-amber-300 p-5 shadow-xs ring-1 ring-amber-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                          {q.duplicate_score ? Math.round(q.duplicate_score * 100) : 88}% Conceptual Match
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{q.subject_name} • {q.unit}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRetain(q.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Retain & Approve
                        </button>
                        <button
                          onClick={() => handleRemove(q.id)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Discard
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                        <span className="font-bold text-amber-900 block mb-1">Flagged Question:</span>
                        <p className="text-slate-900 font-medium">{q.question_text}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-700 block mb-1">
                          {matchedQ ? 'Existing Matched Question in Bank:' : 'Matched Question:'}
                        </span>
                        <p className="text-slate-900 font-medium">
                          {matchedQ ? matchedQ.question_text : 'Original definition question in Question Bank'}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-100">
                      {q.duplicate_notes || 'Detected identical cognitive recall target.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Semantic Similarity Heatmap Matrix */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Pairwise Conceptual Similarity Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cosine similarity matrix between sample Question Bank items. Values near 1.0 (warm colors) indicate conceptual overlap.
              </p>
            </div>
            <button
              onClick={computeMatrix}
              disabled={loadingMatrix}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMatrix ? 'animate-spin' : ''}`} />
              Recompute Matrix
            </button>
          </div>

          {loadingMatrix ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs">Computing dense high-dimensional cosine matrix...</p>
            </div>
          ) : matrixResult ? (
            <div className="space-y-4 overflow-x-auto">
              <div className="min-w-[600px]">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold text-[11px]">
                        Question
                      </th>
                      {matrixResult.matrix.map((_, i) => (
                        <th key={i} className="p-2 border border-slate-200 bg-slate-50 text-slate-700 font-bold text-[11px]">
                          Q{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixResult.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-left text-[11px]">
                          Q{i + 1}
                        </td>
                        {row.map((val, j) => {
                          let cellBg = 'bg-slate-50 text-slate-600';
                          if (i === j) cellBg = 'bg-slate-200 text-slate-900 font-bold';
                          else if (val >= 0.78) cellBg = 'bg-rose-500 text-white font-extrabold';
                          else if (val >= 0.60) cellBg = 'bg-amber-400 text-amber-950 font-bold';
                          else if (val >= 0.40) cellBg = 'bg-blue-100 text-blue-900';
                          else cellBg = 'bg-emerald-50 text-emerald-800';

                          return (
                            <td key={j} className={`p-2 border border-slate-200 text-[11px] ${cellBg}`}>
                              {(val * 100).toFixed(0)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
                <span className="font-semibold text-slate-700">Matrix Legend:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-rose-500"></span>
                  <span>≥ 78% (Near-Duplicate)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400"></span>
                  <span>60% - 77% (Moderate Overlap)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-blue-100 border"></span>
                  <span>40% - 59% (Related Theme)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-50 border"></span>
                  <span>&lt; 40% (Unique Concept)</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Click Recompute Matrix to generate matrix.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
