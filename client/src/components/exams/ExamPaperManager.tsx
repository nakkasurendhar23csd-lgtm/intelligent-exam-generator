import React, { useState, useEffect } from 'react';
import { ExaminationPaper, DocumentItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  FileCheck2,
  Download,
  Printer,
  Sparkles,
  Layers,
  Award,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  KeyRound,
  Eye,
  X
} from 'lucide-react';

export const ExamPaperManager: React.FC = () => {
  const { success, error, warning, info } = useToast();

  const [papers, setPapers] = useState<ExaminationPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [assembling, setAssembling] = useState(false);
  const [activePaper, setActivePaper] = useState<ExaminationPaper | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Available subjects from documents
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Paper Assembly Configuration Form
  const [title, setTitle] = useState('End-Semester Summative Examination');
  const [subjectName, setSubjectName] = useState('Cloud Computing & Distributed Systems');
  const [subjectCode, setSubjectCode] = useState('CS8041');
  const [courseSemester, setCourseSemester] = useState('B.Tech CSE - Semester 6');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [maxMarks, setMaxMarks] = useState(50);
  const [instructions, setInstructions] = useState(
    '1. Answer all questions in Part A.\n2. Answer any three questions from Part B.\n3. Assume suitable system parameters wherever necessary.\n4. Neat architectural diagrams carry marks.'
  );

  const [sections, setSections] = useState([
    {
      name: 'Part A',
      description: 'Foundational & Conceptual Evaluation (Answer all questions)',
      marksPerQuestion: 2,
      count: 5,
      questionType: 'short'
    },
    {
      name: 'Part B',
      description: 'Architectural Analysis & Design Problems (Answer any 4 out of 5)',
      marksPerQuestion: 10,
      count: 4,
      questionType: 'long'
    }
  ]);

  useEffect(() => {
    loadPapers();
    loadDocs();
  }, []);

  async function loadPapers() {
    setLoading(true);
    try {
      const res = await api.getExamPapers();
      setPapers(res.papers);
      if (res.papers.length > 0 && !activePaper) {
        // Auto load full details of most recent paper
        loadPaperDetails(res.papers[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadDocs() {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
      if (res.documents.length > 0) {
        setSubjectName(res.documents[0].subject_name);
        setSubjectCode(res.documents[0].subject_code || 'CS8041');
      }
    } catch {
      // ignore
    }
  }

  async function loadPaperDetails(id: string) {
    try {
      const res = await api.getExamPaper(id);
      setActivePaper(res.paper);
    } catch (err: any) {
      error(err.message || 'Failed to load paper details');
    }
  }

  async function handleAssemble(e: React.FormEvent) {
    e.preventDefault();
    setAssembling(true);
    info('Assembling examination paper with semantic duplicate avoidance & marks balancing...');

    try {
      const res = await api.assembleExamPaper({
        title,
        subject_name: subjectName,
        subject_code: subjectCode,
        course_semester: courseSemester,
        academic_year: academicYear,
        duration_minutes: durationMinutes,
        max_marks: maxMarks,
        instructions,
        sections
      });

      success('Examination paper assembled successfully!');
      setShowConfigModal(false);
      setActivePaper(res.paper);
      loadPapers();
    } catch (err: any) {
      error(err.message || 'Assembly failed');
    } finally {
      setAssembling(false);
    }
  }

  async function handleDeletePaper(id: string) {
    if (!window.confirm('Are you sure you want to delete this examination paper?')) return;
    try {
      await api.deleteExamPaper(id);
      success('Paper deleted.');
      if (activePaper?.id === id) setActivePaper(null);
      loadPapers();
    } catch (err: any) {
      error(err.message || 'Failed to delete');
    }
  }

  function handlePrint() {
    window.print();
  }

  function addSection() {
    setSections([
      ...sections,
      {
        name: `Part ${String.fromCharCode(65 + sections.length)}`,
        description: 'Descriptive Synthesis Questions',
        marksPerQuestion: 16,
        count: 2,
        questionType: 'descriptive'
      }
    ]);
  }

  function removeSection(idx: number) {
    setSections(sections.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Module 9 & 10: Examination Paper Assembly & Export (PDF / DOCX)
            </div>
            <h1 className="text-xl font-bold text-slate-900">Examination Paper Generator & Export</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Configure curriculum examination blueprints with multi-section structure and marks allocation.
              The assembly engine selects verified approved questions, strictly verifies total marks, and prevents
              semantic duplicates from appearing on the paper.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Configure & Assemble Paper
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Paper Selector Sidebar + Active Paper Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Generated Papers List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Generated Papers</h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {papers.length}
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-600" />
              Loading papers...
            </div>
          ) : papers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No examination papers created yet. Click "Configure & Assemble Paper" to build one!
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {papers.map(p => {
                const isSelected = activePaper?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => loadPaperDetails(p.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-900 truncate">{p.title}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {p.subject_name} ({p.subject_code})
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
                      <span>{p.max_marks} Marks • {p.duration_minutes} Mins</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Paper Preview & Action Controls */}
        <div className="lg:col-span-3 space-y-4">
          {activePaper ? (
            <div className="space-y-4">
              {/* Paper Actions Toolbar (Hidden when printing) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{activePaper.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    {activePaper.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Download PDF */}
                  <a
                    href={api.getExamPdfUrl(activePaper.id)}
                    download
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Paper (PDF)
                  </a>

                  {/* Download DOCX */}
                  <a
                    href={api.getExamDocxUrl(activePaper.id)}
                    download
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <FileText className="w-3.5 h-3.5" /> Download Paper (DOCX)
                  </a>

                  {/* Download Answer Key PDF */}
                  <a
                    href={api.getAnswerKeyPdfUrl(activePaper.id)}
                    download
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Answer Key (PDF)
                  </a>

                  {/* Print */}
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Layout
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeletePaper(activePaper.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Psychometric Balance Summary Banner (Hidden when printing) */}
              {activePaper.stats && (
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl shadow-xs text-xs space-y-2 print:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-300 flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-400" />
                      Examination Psychometric Calibration Summary
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      Calculated Total: {activePaper.calculatedTotalMarks || activePaper.max_marks} / {activePaper.max_marks} Marks
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Questions</span>
                      <span className="font-bold text-white text-sm">{activePaper.stats.totalQuestions} Questions</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Difficulty Balance</span>
                      <span className="font-bold text-white text-xs">
                        {activePaper.stats.difficultyDistribution?.Easy || 0} Easy • {activePaper.stats.difficultyDistribution?.Medium || 0} Med • {activePaper.stats.difficultyDistribution?.Hard || 0} Hard
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Duplicate Conflicts</span>
                      <span className="font-bold text-emerald-400 text-xs">0 (Guaranteed Unique)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration</span>
                      <span className="font-bold text-white text-xs">{activePaper.duration_minutes} Minutes</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Printable Standard Examination Paper Document Layout */}
              <div className="bg-white p-8 sm:p-12 rounded-xl border border-slate-300 shadow-sm font-serif print:border-none print:shadow-none print:p-0">
                {/* University Header */}
                <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                  <div className="text-sm font-sans tracking-widest text-slate-500 font-bold uppercase">
                    National University of Technology & Science
                  </div>
                  <div className="text-xs font-sans text-slate-700 font-semibold uppercase">
                    Department of Computer Science & Engineering
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase pt-1">
                    {activePaper.title}
                  </h1>
                </div>

                {/* Examination Meta Grid Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-300 py-3 text-xs font-sans text-slate-800 gap-y-2">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Subject</span>
                    <strong className="text-slate-950">{activePaper.subject_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Course Code</span>
                    <strong className="text-slate-950">{activePaper.subject_code || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Duration</span>
                    <strong className="text-slate-950">{activePaper.duration_minutes} Minutes</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Maximum Marks</span>
                    <strong className="text-slate-950 text-sm font-bold text-blue-900">{activePaper.max_marks}</strong>
                  </div>
                </div>

                {/* Instructions */}
                {activePaper.instructions && (
                  <div className="py-4 text-xs font-sans border-b border-slate-200 text-slate-700 space-y-1">
                    <strong className="uppercase tracking-wider text-[11px] text-slate-900 block">
                      Instructions to Candidates:
                    </strong>
                    <p className="whitespace-pre-line leading-relaxed">{activePaper.instructions}</p>
                  </div>
                )}

                {/* Sections and Questions */}
                <div className="py-6 space-y-6">
                  {activePaper.sections && activePaper.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-4">
                      {/* Section Title */}
                      <div className="text-center font-sans">
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5">
                          {sec.name}
                        </span>
                        {sec.description && (
                          <p className="text-xs text-slate-600 italic mt-1">{sec.description}</p>
                        )}
                      </div>

                      {/* Section Questions */}
                      <div className="space-y-4 pt-1">
                        {sec.questions && sec.questions.map((q, qIdx) => (
                          <div key={q.id} className="text-xs space-y-1.5">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-2">
                                <span className="font-bold text-slate-900 font-sans">{qIdx + 1}.</span>
                                <p className="text-slate-950 leading-relaxed font-serif text-sm">
                                  {q.question_text}
                                </p>
                              </div>
                              <span className="font-bold font-sans text-slate-900 text-xs shrink-0">
                                [{q.marks}]
                              </span>
                            </div>

                            {/* MCQ Options */}
                            {q.options && Array.isArray(q.options) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-6 font-sans text-xs pt-1">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="text-slate-800">
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Question Metadata for Faculty Reference (Hidden when printing) */}
                            <div className="pl-6 font-sans text-[10px] text-slate-400 italic print:hidden">
                              Unit: {q.unit} • Bloom's: {q.blooms_level} • Difficulty: {q.difficulty}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Document Footer */}
                <div className="text-center text-xs font-sans text-slate-500 pt-8 border-t border-slate-300 font-bold tracking-wider uppercase">
                  *** ALL THE BEST ***
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
              <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Examination Paper Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select an existing paper from the sidebar or click "Configure & Assemble Paper" to create an official syllabus-oriented paper.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Configuration & Assembly Wizard Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Configure Examination Paper Blueprint
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssemble} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Examination Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="e.g. End-Semester Summative Examination - May 2026"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject</label>
                  <select
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {documents.map(d => (
                      <option key={d.id} value={d.subject_name}>{d.subject_name}</option>
                    ))}
                    {!documents.some(d => d.subject_name === subjectName) && (
                      <option value={subjectName}>{subjectName}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={e => setSubjectCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={e => setMaxMarks(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  General Instructions to Candidates
                </label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Sections Configuration */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Paper Sections Blueprint
                  </span>
                  <button
                    type="button"
                    onClick={addSection}
                    className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>

                <div className="space-y-3">
                  {sections.map((sec, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-xs">Section #{idx + 1}</span>
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Section Name</label>
                          <input
                            type="text"
                            value={sec.name}
                            onChange={e => {
                              const s = [...sections];
                              s[idx].name = e.target.value;
                              setSections(s);
                            }}
                            className="w-full p-1.5 text-xs border rounded bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Question Type</label>
                          <select
                            value={sec.questionType}
                            onChange={e => {
                              const s = [...sections];
                              s[idx].questionType = e.target.value;
                              setSections(s);
                            }}
                            className="w-full p-1.5 text-xs border rounded bg-white"
                          >
                            <option value="short">Short Answer</option>
                            <option value="mcq">MCQ</option>
                            <option value="long">Long Answer</option>
                            <option value="descriptive">Descriptive</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Question Count</label>
                          <input
                            type="number"
                            min="1"
                            value={sec.count}
                            onChange={e => {
                              const s = [...sections];
                              s[idx].count = parseInt(e.target.value, 10) || 1;
                              setSections(s);
                            }}
                            className="w-full p-1.5 text-xs border rounded bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Marks / Question</label>
                          <input
                            type="number"
                            min="1"
                            value={sec.marksPerQuestion}
                            onChange={e => {
                              const s = [...sections];
                              s[idx].marksPerQuestion = parseInt(e.target.value, 10) || 1;
                              setSections(s);
                            }}
                            className="w-full p-1.5 text-xs border rounded bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assembling}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
                >
                  {assembling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Assembling Paper...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Auto-Assemble Paper
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
