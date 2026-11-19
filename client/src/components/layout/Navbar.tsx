import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  UserCheck,
  ShieldAlert,
  LogOut,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const Navbar: React.FC<{ activeTab: string; onSelectTab: (tab: string) => void }> = ({ activeTab, onSelectTab }) => {
  const { user, switchDemoUser, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & System Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">EduRAG</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  RAG & Semantic Analysis
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Intelligent Examination Paper Generation Framework</p>
            </div>
          </div>

          {/* Right Action Controls: Role Switcher & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Switcher */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="px-2 text-slate-500 font-medium flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Active Persona:
              </span>
              <button
                onClick={() => switchDemoUser('faculty')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  user?.role === 'faculty'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Faculty
              </button>
              <button
                onClick={() => switchDemoUser('admin')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  user?.role === 'admin'
                    ? 'bg-white text-purple-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Administrator
              </button>
            </div>

            {/* User Info Badge */}
            {user && (
              <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight flex items-center gap-1">
                    {user.name}
                    {user.role === 'admin' && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">{user.department || user.email}</div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
