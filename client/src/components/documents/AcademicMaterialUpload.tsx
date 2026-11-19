import React, { useState, useEffect } from 'react';
import { DocumentItem, DocumentChunk } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  Layers,
  Search,
  BookOpen,
  X,
  Sparkles
} from 'lucide-react';

export const AcademicMaterialUpload: React.FC = () => {
  const { success, error, info } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [subjectName, setSubjectName] = useState('Cloud Computing & Distributed Systems');
  const [subjectCode, setSubjectCode] = useState('CS8041');
  const [courseSemester, setCourseSemester] = useState('B.Tech CSE - Semester 6');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [units, setUnits] = useState('Unit 1: Cloud Architecture, Unit 2: Virtualization, Unit 3: Distributed Storage, Unit 4: Cloud Security, Unit 5: Serverless');

  // Chunk inspection drawer modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err: any) {
      error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      error('Please select a PDF, DOCX, or TXT file to upload.');
      return;
    }
    if (!subjectName.trim()) {
      error('Subject name is required.');
      return;
    }

    setUploading(true);
    info('Uploading document and initiating vector chunking pipeline...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject_name', subjectName);
      formData.append('subject_code', subjectCode);
      formData.append('course_semester', courseSemester);
      formData.append('academic_year', academicYear);
      formData.append('units', units);

      const res = await api.uploadDocument(formData);
      success(res.message || 'Document indexed into vector database successfully!');
      setFile(null);
      // Reset file input element
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadDocuments();
    } catch (err: any) {
      error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleInspect(doc: DocumentItem) {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await api.getDocument(doc.id);
      setDocChunks(res.chunks);
    } catch (err: any) {
      error(err.message || 'Failed to load document chunks');
    } finally {
      setLoadingChunks(false);
    }
  }

  async function handleReindex(id: string) {
    try {
      info('Re-indexing document chunks and updating dense embeddings...');
      await api.reindexDocument(id);
      success('Document re-indexed successfully!');
      loadDocuments();
    } catch (err: any) {
      error(err.message || 'Re-index failed');
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and all its vector chunks? This action is permanent.`)) {
      return;
    }

    try {
      await api.deleteDocument(id);
      success('Document and vector chunks removed.');
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      loadDocuments();
    } catch (err: any) {
      error(err.message || 'Delete failed');
    }
  }

  const filteredDocs = documents.filter(d =>
    d.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Module 2 & 3: Curriculum Ingestion & RAG Vector Pipeline
            </div>
            <h1 className="text-xl font-bold text-slate-900">Academic Material Upload & Vector Storage</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Upload syllabus documents, textbooks, lecture notes, or question banks in PDF, DOCX, or TXT format.
              The system extracts text, partitions it into semantic chunks with overlap, computes dense vector embeddings,
              and maps chunks to specific syllabus units for grounded RAG generation.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Form Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-600" />
          Upload New Academic Document
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject Name *</label>
              <input
                type="text"
                value={subjectName}
                onChange={e => setSubjectName(e.target.value)}
                placeholder="e.g. Cloud Computing & Distributed Systems"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject Code</label>
              <input
                type="text"
                value={subjectCode}
                onChange={e => setSubjectCode(e.target.value)}
                placeholder="e.g. CS8041"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course / Semester</label>
              <input
                type="text"
                value={courseSemester}
                onChange={e => setCourseSemester(e.target.value)}
                placeholder="e.g. B.Tech CSE - Semester 6"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Syllabus Units (Comma-separated)
            </label>
            <input
              type="text"
              value={units}
              onChange={e => setUnits(e.target.value)}
              placeholder="e.g. Unit 1: Cloud Architecture, Unit 2: Virtualization, Unit 3: Distributed Storage"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500">
              Extracted document chunks will be automatically mapped to these units for precise syllabus-oriented retrieval.
            </span>
          </div>

          {/* Drag & Drop File Input */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-6 text-center transition bg-slate-50/50">
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
              className="hidden"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer block">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">
                {file ? file.name : 'Click to select file or drag & drop'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt) up to 25MB
              </p>
              {file && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  {(file.size / 1024).toFixed(1)} KB selected
                </div>
              )}
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition ${
                uploading || !file
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Extracting Text & Vector Indexing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Upload & Vectorize Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Indexed Course Materials</h2>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {filteredDocs.length} Documents
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents or subjects..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading course materials...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No matching academic documents found.</p>
            <p className="text-xs text-slate-400 mt-1">Upload a PDF or DOCX file using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document / File</th>
                  <th className="py-3 px-4">Subject & Code</th>
                  <th className="py-3 px-4">Semester & Year</th>
                  <th className="py-3 px-4">Syllabus Units</th>
                  <th className="py-3 px-4">Vector Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDocs.map(doc => {
                  const statusBadges = {
                    indexed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    processing: 'bg-amber-50 text-amber-700 border-amber-200',
                    uploaded: 'bg-blue-50 text-blue-700 border-blue-200',
                    error: 'bg-rose-50 text-rose-700 border-rose-200'
                  };

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 uppercase font-bold text-[10px]">
                            {doc.file_type}
                          </div>
                          <div>
                            <span className="block truncate max-w-xs">{doc.original_filename}</span>
                            <span className="text-[10px] text-slate-400">
                              {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{doc.subject_name}</span>
                        {doc.subject_code && (
                          <span className="block text-[11px] text-slate-500 font-mono">{doc.subject_code}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span>{doc.course_semester}</span>
                        <span className="block text-[11px] text-slate-400">{doc.academic_year}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {doc.units.slice(0, 3).map((u, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] truncate max-w-[120px]">
                              {u}
                            </span>
                          ))}
                          {doc.units.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                              +{doc.units.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {doc.chunk_count} chunks
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadges[doc.status] || ''}`}>
                          {doc.status === 'indexed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {doc.status === 'processing' && <Clock className="w-3 h-3 text-amber-600 animate-spin" />}
                          {doc.status === 'error' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                          {doc.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleInspect(doc)}
                            title="Inspect Vector Chunks"
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReindex(doc.id)}
                            title="Re-Index Chunks"
                            className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.original_filename)}
                            title="Delete Document"
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vector Chunks Inspector Drawer / Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Vector RAG Chunks Inspector: {selectedDoc.original_filename}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDoc.subject_name} • {selectedDoc.chunk_count} Chunks Indexed in Database
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingChunks ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">Loading vector embeddings and chunks...</p>
                </div>
              ) : (
                docChunks.map(chunk => (
                  <div key={chunk.id} className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        Chunk #{chunk.chunk_index + 1}
                      </span>
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        Unit: {chunk.unit}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ~{chunk.token_count} Tokens • Dense 256-D Normalized
                      </span>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-sans bg-slate-50/60 p-2.5 rounded border border-slate-100">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
