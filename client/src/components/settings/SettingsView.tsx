import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Settings,
  Key,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sparkles,
  Sliders,
  ShieldCheck
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { success, error, info } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);

  // Settings state
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('hybrid');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.78);
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(100);

  const [currentSettings, setCurrentSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setCurrentSettings(res.settings);
      if (res.settings.ai_provider) setAiProvider(res.settings.ai_provider);
      if (res.settings.similarity_threshold) setSimilarityThreshold(parseFloat(res.settings.similarity_threshold));
      if (res.settings.chunk_size) setChunkSize(parseInt(res.settings.chunk_size, 10));
      if (res.settings.chunk_overlap) setChunkOverlap(parseInt(res.settings.chunk_overlap, 10));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveSettings({
        gemini_api_key: geminiKey || undefined,
        openai_api_key: openaiKey || undefined,
        ai_provider: aiProvider,
        similarity_threshold: similarityThreshold,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
      success('System settings saved successfully!');
      setGeminiKey('');
      setOpenaiKey('');
      loadSettings();
    } catch (err: any) {
      error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function testApiKey(provider: 'gemini' | 'openai') {
    const keyToTest = provider === 'gemini' ? geminiKey : openaiKey;
    if (!keyToTest) {
      error(`Please enter an API key for ${provider.toUpperCase()} first.`);
      return;
    }

    if (provider === 'gemini') setTestingGemini(true);
    else setTestingOpenAI(true);

    try {
      const res = await api.testKey(provider, keyToTest);
      if (res.success) {
        success(res.message || 'API key validated successfully!');
      } else {
        error(res.error || 'API validation failed');
      }
    } catch (err: any) {
      error(err.message || 'Test failed');
    } finally {
      if (provider === 'gemini') setTestingGemini(false);
      else setTestingOpenAI(false);
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
              Configuration & Cognitive Parameters
            </div>
            <h1 className="text-xl font-bold text-slate-900">AI Model & System Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Configure generative AI providers (Google Gemini or OpenAI), semantic similarity sensitivity thresholds,
              and document chunking parameters. When external keys are absent, the system uses its built-in
              dense semantic embedding and syllabus-grounded NLP engine.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Model Keys Box */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            AI Provider Credentials & Security
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Gemini */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm">Google Gemini API</span>
                {currentSettings.gemini_api_key_configured ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Configured
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    Using Local NLP Engine
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder={currentSettings.gemini_api_key ? '••••••••••••••••' : 'Enter AIzaSy... key'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => testApiKey('gemini')}
                  disabled={testingGemini || !geminiKey}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                >
                  {testingGemini ? 'Validating...' : 'Test Connection'}
                </button>
              </div>
            </div>

            {/* OpenAI */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm">OpenAI API (GPT-4o)</span>
                {currentSettings.openai_api_key_configured ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Configured
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  placeholder={currentSettings.openai_api_key ? '••••••••••••••••' : 'Enter sk-... key'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => testApiKey('openai')}
                  disabled={testingOpenAI || !openaiKey}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                >
                  {testingOpenAI ? 'Validating...' : 'Test Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Semantic Similarity Sensitivity Parameters */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Semantic Question Analysis & RAG Calibration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Threshold */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Duplicate Sensitivity ({Math.round(similarityThreshold * 100)}%)
              </label>
              <input
                type="range"
                min="0.60"
                max="0.95"
                step="0.01"
                value={similarityThreshold}
                onChange={e => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                Questions with cosine similarity &ge; {similarityThreshold} are marked as conceptual near-duplicates.
              </p>
            </div>

            {/* Chunk Size */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Text Chunk Size ({chunkSize} Chars)
              </label>
              <input
                type="range"
                min="300"
                max="1200"
                step="50"
                value={chunkSize}
                onChange={e => setChunkSize(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                Target segment size when partitioning syllabus PDFs or DOCXs.
              </p>
            </div>

            {/* Chunk Overlap */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Chunk Overlap ({chunkOverlap} Chars)
              </label>
              <input
                type="range"
                min="30"
                max="200"
                step="10"
                value={chunkOverlap}
                onChange={e => setChunkOverlap(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                Preserves boundary context between adjacent academic paragraphs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving Configuration...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
