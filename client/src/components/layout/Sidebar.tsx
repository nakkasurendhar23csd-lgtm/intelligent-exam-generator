import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  Cpu,
  GitCompare,
  Database,
  FileCheck2,
  ShieldAlert,
  Settings,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  metrics?: {
    totalDocuments: number;
    totalQuestions: number;
    approvedQuestions: number;
    duplicateQuestions: number;
    totalPapers: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, metrics }) => {
  const { user } = useAuth();

  const navigation = [
    {
      id: 'dashboard',
      name: 'Faculty Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'documents',
      name: 'Academic Materials (RAG)',
      icon: UploadCloud,
      badge: metrics?.totalDocuments ? String(metrics.totalDocuments) : null
    },
    {
      id: 'generator',
      name: 'AI Question Generator',
      icon: Cpu,
      badge: 'RAG'
    },
    {
      id: 'analysis',
      name: 'Semantic Question Analysis',
      icon: GitCompare,
      badge: metrics?.duplicateQuestions ? `${metrics.duplicateQuestions} dup` : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'bank',
      name: 'Question Bank',
      icon: Database,
      badge: metrics?.totalQuestions ? String(metrics.totalQuestions) : null
    },
    {
      id: 'exams',
      name: 'Examination Papers',
      icon: FileCheck2,
      badge: metrics?.totalPapers ? String(metrics.totalPapers) : null
    }
  ];

  const secondaryNavigation = [
    ...(user?.role === 'admin'
      ? [
          {
            id: 'admin',
            name: 'Administrator Portal',
            icon: ShieldAlert,
            badge: 'Admin'
          }
        ]
      : []),
    {
      id: 'settings',
      name: 'AI & System Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 flex-1 space-y-6">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Main Framework Modules
          </div>
          <nav className="space-y-1">
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'hover:bg-slate-800/80 hover:text-white text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.badgeColor || (isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Governance & Settings
          </div>
          <nav className="space-y-1">
            {secondaryNavigation.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-800/80 hover:text-white text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-700/50">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Grounded RAG Status Footnote */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center space-x-2 text-emerald-400 font-medium mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Vector RAG Pipeline Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Questions strictly grounded in uploaded course syllabus chunks via dense semantic vectors.
        </p>
      </div>
    </aside>
  );
};
