import React from 'react';
import { DashboardStats, AuditLogItem } from '../../types';
import {
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Award,
  Upload,
  Cpu,
  GitCompare,
  PlusCircle,
  BookOpen,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  stats: DashboardStats | null;
  recentActivities: AuditLogItem[];
  onNavigate: (tab: string) => void;
}

export const FacultyDashboard: React.FC<DashboardProps> = ({ stats, recentActivities, onNavigate }) => {
  const metrics = stats?.metrics || {
    totalDocuments: 0,
    totalQuestions: 0,
    approvedQuestions: 0,
    duplicateQuestions: 0,
    totalPapers: 0
  };

  const diff = stats?.difficultyDistribution || { Easy: 0, Medium: 0, Hard: 0 };
  const totalDiff = (diff.Easy + diff.Medium + diff.Hard) || 1;

  const blooms = stats?.bloomsDistribution || {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0
  };
  const totalBlooms = Object.values(blooms).reduce((a, b) => a + b, 0) || 1;

  const bloomColors: Record<string, { bg: string; fill: string; bar: string }> = {
    Remember: { bg: 'bg-emerald-50 text-emerald-700', fill: 'fill-emerald-500', bar: 'bg-emerald-500' },
    Understand: { bg: 'bg-teal-50 text-teal-700', fill: 'fill-teal-500', bar: 'bg-teal-500' },
    Apply: { bg: 'bg-blue-50 text-blue-700', fill: 'fill-blue-500', bar: 'bg-blue-500' },
    Analyze: { bg: 'bg-indigo-50 text-indigo-700', fill: 'fill-indigo-500', bar: 'bg-indigo-500' },
    Evaluate: { bg: 'bg-purple-50 text-purple-700', fill: 'fill-purple-500', bar: 'bg-purple-500' },
    Create: { bg: 'bg-rose-50 text-rose-700', fill: 'fill-rose-500', bar: 'bg-rose-500' }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            AI-Assisted Syllabus Evaluation & RAG Examination Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Intelligent Examination Paper Generation Framework
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Upload course curriculum documents, extract grounded academic chunks into the vector store,
            generate Bloom-calibrated questions, and detect semantic conceptual duplicates before assembling official papers.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('generator')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md transition"
            >
              <Cpu className="w-4 h-4" />
              Generate Questions
            </button>
            <button
              onClick={() => onNavigate('documents')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold flex items-center gap-2 border border-white/20 transition"
            >
              <Upload className="w-4 h-4" />
              Upload Materials
            </button>
            <button
              onClick={() => onNavigate('exams')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold flex items-center gap-2 border border-white/20 transition"
            >
              <Award className="w-4 h-4" />
              Assemble Exam Paper
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 5 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Documents */}
        <div
          onClick={() => onNavigate('documents')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded Docs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalDocuments}</span>
            <span className="text-xs text-slate-400 font-medium">Curricula</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">Chunked & Vector Indexed</p>
        </div>

        {/* Total Generated Questions */}
        <div
          onClick={() => onNavigate('bank')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions Bank</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalQuestions}</span>
            <span className="text-xs text-slate-400 font-medium">Items</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">Syllabus Grounded</p>
        </div>

        {/* Approved Questions */}
        <div
          onClick={() => onNavigate('bank')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty Approved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.approvedQuestions}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {Math.round((metrics.approvedQuestions / (metrics.totalQuestions || 1)) * 100)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">Ready for Assembly</p>
        </div>

        {/* Duplicate Questions Detected */}
        <div
          onClick={() => onNavigate('analysis')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Semantic Overlaps</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.duplicateQuestions}</span>
            <span className="text-xs text-amber-600 font-medium">Filtered</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">Cosine Sim ≥ 0.78</p>
        </div>

        {/* Total Exam Papers */}
        <div
          onClick={() => onNavigate('exams')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-purple-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Papers</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalPapers}</span>
            <span className="text-xs text-slate-400 font-medium">Generated</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">PDF & DOCX Ready</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bloom's Taxonomy Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Bloom's Revised Taxonomy Cognitive Distribution
              </h2>
              <p className="text-xs text-slate-500">Distribution across 6 cognitive tiers in current Question Bank</p>
            </div>
            <button
              onClick={() => onNavigate('bank')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View Bank <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(Object.keys(blooms) as Array<keyof typeof blooms>).map((tier, idx) => {
              const count = blooms[tier] || 0;
              const pct = Math.round((count / totalBlooms) * 100);
              const styling = bloomColors[tier];

              return (
                <div key={tier} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        L{idx + 1}
                      </span>
                      {tier}
                    </span>
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-800">{count}</span> questions ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${styling.bar}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulty Level Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Question Difficulty Balance
              </h2>
              <p className="text-xs text-slate-500">Psychometric difficulty calibration</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Easy */}
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                <span>EASY (Foundational)</span>
                <span>{diff.Easy} ({Math.round((diff.Easy / totalDiff) * 100)}%)</span>
              </div>
              <div className="w-full bg-emerald-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${Math.round((diff.Easy / totalDiff) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1.5">Direct recall, basic definitions and concept identification</p>
            </div>

            {/* Medium */}
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
              <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                <span>MEDIUM (Intermediate)</span>
                <span>{diff.Medium} ({Math.round((diff.Medium / totalDiff) * 100)}%)</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.round((diff.Medium / totalDiff) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-blue-700 mt-1.5">Comprehension, procedural application & comparisons</p>
            </div>

            {/* Hard */}
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50">
              <div className="flex justify-between items-center text-xs font-bold text-rose-900">
                <span>HARD (Advanced)</span>
                <span>{diff.Hard} ({Math.round((diff.Hard / totalDiff) * 100)}%)</span>
              </div>
              <div className="w-full bg-rose-200 rounded-full h-2 mt-2">
                <div
                  className="bg-rose-600 h-2 rounded-full"
                  style={{ width: `${Math.round((diff.Hard / totalDiff) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-rose-700 mt-1.5">Critical evaluation, synthesis, design & architecture</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit-wise Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit-Wise Question Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Unit-Wise Syllabus Coverage
              </h2>
              <p className="text-xs text-slate-500">Grounded questions indexed per syllabus module</p>
            </div>
          </div>

          {stats?.unitDistribution && stats.unitDistribution.length > 0 ? (
            <div className="space-y-3">
              {stats.unitDistribution.map(u => (
                <div key={u.unit} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-800 truncate pr-4 max-w-md">{u.unit}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-[11px]">
                      {u.count} questions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No syllabus units indexed yet. Upload course materials to begin.
            </div>
          )}
        </div>

        {/* Recent System Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Recent System Activity
              </h2>
              <p className="text-xs text-slate-500">Live audit trail</p>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
            {recentActivities.slice(0, 7).map(act => (
              <div key={act.id} className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>{act.action.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  by {act.user_email}
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
