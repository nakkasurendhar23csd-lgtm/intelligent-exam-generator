import React, { useState, useEffect } from 'react';
import { User, AuditLogItem, SystemStats } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert,
  Users,
  Activity,
  Server,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Database
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { success, error, warning } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'health'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'faculty' | 'admin'>('faculty');
  const [department, setDepartment] = useState('Computer Science & Engineering');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.getAdminUsers();
        setUsers(res.users);
      } else if (activeTab === 'logs') {
        const res = await api.getAuditLogs(100);
        setLogs(res.logs);
      } else if (activeTab === 'health') {
        const res = await api.getSystemStats();
        setStats(res);
      }
    } catch (err: any) {
      error(err.message || 'Failed to fetch administrator data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createAdminUser({ name, email, password, role, department });
      success(`User ${email} created successfully.`);
      setShowAddUserModal(false);
      setName('');
      setEmail('');
      setPassword('');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create user');
    }
  }

  async function handleToggleRole(id: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'faculty' : 'admin';
    try {
      await api.updateUserRole(id, newRole);
      success(`Role updated to ${newRole}.`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to update role');
    }
  }

  async function handleDeleteUser(id: string, userEmail: string) {
    if (!window.confirm(`Permanently delete user ${userEmail}?`)) return;
    try {
      await api.deleteUser(id);
      success('User deleted.');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete user');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              Administrative Governance & Activity Audit
            </div>
            <h1 className="text-xl font-bold text-slate-900">Administrator Management Portal</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Manage system faculty and administrator accounts, inspect comprehensive activity audit logs,
              and monitor vector database engine metrics and server runtime health.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'users' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'logs' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Activity Logs
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'health' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Diagnostics
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Authorized Faculty & System Administrators
              </h2>
              <p className="text-xs text-slate-500">Configure role-based access and permissions</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Add New User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Name & Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Registered</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">{u.name}</strong>
                      <span className="text-[11px] text-slate-500">{u.email}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">{u.department || 'Computer Science'}</td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(u.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="px-2 py-1 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition"
                        >
                          Switch to {u.role === 'admin' ? 'Faculty' : 'Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: System Activity Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Comprehensive Activity Audit Trail ({logs.length})
              </h2>
              <p className="text-xs text-slate-500">Live immutable audit log of document uploads, AI generations, and exam assemblies</p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{l.user_email}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{l.resource_type}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-sans truncate max-w-xs">{l.details}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: System Diagnostics */}
      {activeTab === 'health' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Database Engine</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{stats.databaseEngine}</div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> High Performance WAL Mode Active
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Vector Chunks in Store</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{stats.vectorChunks} Vectors</div>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Dense Cosine Similarity</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Questions in Bank</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{stats.questions} Items</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Grounded Syllabus Items</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Server Runtime</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{stats.nodeVersion}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Platform: {stats.platform}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Register New User Account
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Grace Hopper"
                  className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="e.g. hopper@university.edu"
                  className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">User Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="faculty">Faculty Member / Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 bg-slate-200 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
