'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, ArrowLeft, Calendar, Loader2, FileText,
  GraduationCap, Utensils, ClipboardList, User, Shield, LogOut,
  Heart, Sunrise, Trophy, Tv, Settings
} from 'lucide-react';
import Sidebar, { MobileHeader } from '@/components/Sidebar';

const CATEGORY_COLORS = {
  Akademik: '#8b5cf6', Yemek: '#f59e0b',
  Program:  '#06b6d4', Sağlık: '#ef4444',
  Namaz: '#10b981',   Dahili: '#a855f7',
};
const CATEGORY_ICONS = {
  Akademik: GraduationCap, Yemek: Utensils,
  Program:  ClipboardList,  Sağlık: Heart,
  Namaz: Sunrise,           Dahili: FileText,
};

export default function SummaryPage() {
  const { user, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [range, setRange]             = useState('week'); // 'week' | 'month'
  const [classFilter, setClassFilter]   = useState('All');
  const [reports, setReports]           = useState([]);
  const [students, setStudents]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [leaveEnabled, setLeaveEnabled] = useState(false);

  useEffect(() => {
    const hasLocalSession = typeof window !== 'undefined' && !!localStorage.getItem('localUser');
    if (!authLoading && !user && !hasLocalSession) window.location.replace('/login');
  }, [user, authLoading]);

  const fetchStudents = async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && apiData.students) {
        setStudents(apiData.students);
        return;
      }
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    setLoading(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && apiData.reports) {
        setReports(apiData.reports);
        return;
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        fetchStudents();
      });
      const instId = institutionId || 'yamanevler';
      fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (d.success && d.settings) setLeaveEnabled(!!d.settings.enabled); })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (students.length > 0) {
      Promise.resolve().then(() => fetchReports());
    }
  }, [students, range]);

  // Computed
  const classes = ['All', ...Array.from(new Set(students.map(s => s.class))).sort()];
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  const filteredReports = reports.filter(r => {
    // 1. Filter by date range
    const ts = r.created_at ? new Date(r.created_at) : null;
    if (!ts) return false;
    const now = new Date();
    if (range === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (ts < weekAgo) return false;
    } else if (range === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      if (ts < monthAgo) return false;
    }

    // 2. Filter by class
    if (classFilter === 'All') return true;
    const st = studentMap[r.student_id];
    return st?.class === classFilter;
  });

  // Category distribution
  const catCounts = {};
  filteredReports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const categoryData = Object.keys(catCounts).map(k => ({ name: k, value: catCounts[k] }));

  // Daily breakdown
  const dayCounts = {};
  filteredReports.forEach(r => {
    const ts = r.created_at ? new Date(r.created_at) : new Date();
    const dayStr = ts.toLocaleDateString('tr-TR', { weekday: 'short', month: 'numeric', day: 'numeric' });
    dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
  });
  const dayData = Object.keys(dayCounts).map(k => ({ day: k, count: dayCounts[k] })).reverse();

  // Most active students
  const studentCounts = {};
  filteredReports.forEach(r => { studentCounts[r.student_id] = (studentCounts[r.student_id] || 0) + 1; });

  if (authLoading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans">
      <Sidebar />
      <MobileHeader title="Özet" />



      {/* Main Content */}
      <main className="flex-1 pb-10 overflow-y-auto">
        <div className="bg-gradient-to-r from-[#eef5fc] via-[#e2eeff] to-[#d6e7ff] pt-8 pb-6 px-6 md:px-10 border-b border-blue-100/60">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="p-2.5 bg-white rounded-xl text-slate-600 border border-slate-200 hover:bg-blue-50 shadow-sm">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Rapor Özeti</h1>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                  {range === 'week' ? 'Bu haftaki' : 'Bu ayki'} genel performans istatistikleri ({institutionName})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setRange('week')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${range === 'week' ? 'bg-[#06429c] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
                Bu Hafta
              </button>
              <button onClick={() => setRange('month')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${range === 'month' ? 'bg-[#06429c] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
                Bu Ay
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 md:px-10 mt-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Toplam Rapor', value: filteredReports.length, color: 'text-blue-700' },
              { label: 'Akademik Rapor', value: catCounts['Akademik'] || 0, color: 'text-violet-600' },
              { label: 'Namaz Raporu', value: catCounts['Namaz'] || 0, color: 'text-emerald-600' },
              { label: 'Aktif Öğrenci', value: Object.keys(studentCounts).length, color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">Günlük Rapor Dağılımı</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData}>
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06429c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">Kategori Dağılımı</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#06429c'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
