import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { FacultyDashboard } from './components/dashboard/FacultyDashboard';
import { AcademicMaterialUpload } from './components/documents/AcademicMaterialUpload';
import { QuestionGenerator } from './components/generation/QuestionGenerator';
import { SemanticAnalysisStudio } from './components/analysis/SemanticAnalysisStudio';
import { QuestionBank } from './components/questionBank/QuestionBank';
import { ExamPaperManager } from './components/exams/ExamPaperManager';
import { AdminPortal } from './components/admin/AdminPortal';
import { SettingsView } from './components/settings/SettingsView';
import { DashboardStats, AuditLogItem } from './types';
import { api } from './services/api';
import { RefreshCw } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    loadAppMetadata();
  }, [activeTab, user]);

  async function loadAppMetadata() {
    try {
      const statsData = await api.getQuestionStats();
      setStats(statsData);
    } catch {
      // ignore
    }

    try {
      if (user?.role === 'admin') {
        const logsData = await api.getAuditLogs(15);
        setRecentActivities(logsData.logs || []);
      }
    } catch {
      // ignore
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm font-semibold tracking-wide">
            Initializing Intelligent Examination Framework...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <div className="hidden md:block print:hidden">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            metrics={stats?.metrics}
          />
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex justify-around p-2 text-[10px] font-semibold text-slate-600 print:hidden">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-1.5 flex flex-col items-center ${activeTab === 'dashboard' ? 'text-blue-600' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`p-1.5 flex flex-col items-center ${activeTab === 'documents' ? 'text-blue-600' : ''}`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`p-1.5 flex flex-col items-center ${activeTab === 'generator' ? 'text-blue-600' : ''}`}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`p-1.5 flex flex-col items-center ${activeTab === 'analysis' ? 'text-blue-600' : ''}`}
          >
            Semantic
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`p-1.5 flex flex-col items-center ${activeTab === 'bank' ? 'text-blue-600' : ''}`}
          >
            Bank
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`p-1.5 flex flex-col items-center ${activeTab === 'exams' ? 'text-blue-600' : ''}`}
          >
            Exams
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-16 md:pb-8">
          {activeTab === 'dashboard' && (
            <FacultyDashboard
              stats={stats}
              recentActivities={recentActivities}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'documents' && <AcademicMaterialUpload />}

          {activeTab === 'generator' && (
            <QuestionGenerator onNavigateToBank={() => setActiveTab('bank')} />
          )}

          {activeTab === 'analysis' && <SemanticAnalysisStudio />}

          {activeTab === 'bank' && (
            <QuestionBank onNavigateToExam={() => setActiveTab('exams')} />
          )}

          {activeTab === 'exams' && <ExamPaperManager />}

          {activeTab === 'admin' && <AdminPortal />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
