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
  GraduationCap, Utensils, ClipboardList, User, Shield, LogOut
} from 'lucide-react';

const CATEGORY_COLORS = {
  Akademik: '#8b5cf6', Yemek: '#f59e0b',
  Program: '#06b6d4', Diğer: '#6b7280',
};
const CATEGORY_ICONS = {
  Akademik: GraduationCap, Yemek: Utensils,
  Program: ClipboardList, Diğer: FileText,
};

export default function SummaryPage() {
  const { user, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [range, setRange]             = useState('week'); // 'week' | 'month'
  const [classFilter, setClassFilter]   = useState('All');
  const [reports, setReports]           = useState([]);
  const [students, setStudents]         = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) { fetchStudents(); }
  }, [user]);

  useEffect(() => {
    if (students.length > 0) fetchReports();
  }, [students, range]);

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

  // Computed
  const classes = ['All', ...Array.from(new Set(students.map(s => s.class))).sort()];
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  const filteredReports = reports.filter(r => {
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
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#06429c] via-[#053787] to-[#011c4d] text-white flex-col justify-between p-6 shrink-0 shadow-2xl">
        <div>
          <div className="flex flex-col items-center text-center space-y-3 pt-4 pb-8 border-b border-white/10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#06429c]" fill="currentColor">
                <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-blue-200 uppercase">{(institutionName || 'Kurumsal Rapor').toUpperCase()}</h2>
              <h1 className="text-sm font-extrabold tracking-wider text-white">YÖNETİCİ PANELİ</h1>
            </div>
          </div>
          <nav className="mt-8 space-y-2">
            <a
              href="/"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all"
            >
              <User size={18} />
              Öğrenciler
            </a>
            <a
              href="/summary"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/90 text-white font-bold text-sm shadow-md transition-all border border-blue-400/30"
            >
              <TrendingUp size={18} />
              Özet Raporlar
            </a>
            {role === 'admin' && (
              <a
                href="/admin"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all"
              >
                <Shield size={18} />
                Ayarlar
              </a>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-red-300 hover:bg-red-500/10 font-semibold text-sm transition-all"
            >
              <LogOut size={18} />
              Çıkış
            </button>
          </nav>
        </div>

        {/* Bottom Logo Branding */}
        <div className="pt-6 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center p-2 text-white">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-white">{(institutionName || 'Sistem Yönetimi').toUpperCase()}</div>
            <div className="text-blue-200 text-[10px]">Aktif Kurum</div>
          </div>
        </div>
      </aside>

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
              { label: 'Aktif Öğrenci', value: Object.keys(studentCounts).length, color: 'text-emerald-600' },
              { label: 'Program Raporu', value: catCounts['Program'] || 0, color: 'text-cyan-600' },
              { label: 'Yemek Raporu', value: catCounts['Yemek'] || 0, color: 'text-amber-600' },
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
