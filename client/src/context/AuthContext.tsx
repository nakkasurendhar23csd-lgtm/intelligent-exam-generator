import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: string; department?: string }) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: 'faculty' | 'admin') => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          // Token invalid or expired, log in as default demo faculty
          await autoLoginDemo('faculty');
        }
      } else {
        // Automatically sign in demo faculty user on initial load for instant frictionless testing
        await autoLoginDemo('faculty');
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  async function autoLoginDemo(role: 'faculty' | 'admin') {
    try {
      const email = role === 'admin' ? 'admin@university.edu' : 'faculty@university.edu';
      const pass = role === 'admin' ? 'admin123' : 'faculty123';
      const res = await api.login(email, pass);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      console.warn('Auto-login demo failed:', e);
    }
  }

  async function login(email: string, pass: string) {
    const res = await api.login(email, pass);
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
  }

  async function register(data: { name: string; email: string; password: string; role?: string; department?: string }) {
    const res = await api.register(data);
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  async function switchDemoUser(role: 'faculty' | 'admin') {
    setLoading(true);
    await autoLoginDemo(role);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, switchDemoUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
