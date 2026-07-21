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
  GraduationCap, Utensils, ClipboardList
} from 'lucide-react';

const CATEGORY_COLORS = {
  Akademik: '#8b5cf6', Yemek: '#f59e0b',
  Program: '#06b6d4', Diğer: '#6b7280',
};
const CATEGORY_ICONS = {
  Akademik: GraduationCap, Yemek: Utensils,
  Program: ClipboardList, Diğer: FileText,
};

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d;
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}

export default function SummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [range, setRange]           = useState('week'); // 'week' | 'month'
  const [classFilter, setClassFilter] = useState('All');
  const [reports, setReports]       = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);

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
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) setStudents(data.students || []);
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students/reports');
      const data = await res.json();
      if (data.success) setReports(data.reports || []);
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
    const ts = r.created_at instanceof Timestamp ? r.created_at.toDate() : new Date(r.created_at);
    const dayStr = ts.toLocaleDateString('tr-TR', { weekday: 'short', month: 'numeric', day: 'numeric' });
    dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
  });
  const dayData = Object.keys(dayCounts).map(k => ({ day: k, count: dayCounts[k] })).reverse();

  // Most active students
  const studentCounts = {};
  filteredReports.forEach(r => { studentCounts[r.student_id] = (studentCounts[r.student_id] || 0) + 1; });
  const topStudents = Object.entries(studentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ student: studentMap[id], count }));

  if (authLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 size={32} className="text-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      <div className="fixed top-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')}
              className="p-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <TrendingUp size={20} className="text-purple-400" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                  Rapor Özeti
                </h1>
              </div>
              <p className="text-zinc-600 text-xs pl-12">
                {range === 'week' ? 'Bu haftaki' : 'Bu ayki'} rapor istatistikleri
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-1 bg-black/30 border border-white/8 rounded-xl p-1">
              {['week', 'month'].map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    range === r ? 'bg-purple-500 text-white' : 'text-zinc-500 hover:text-zinc-200'
                  }`}>
                  <Calendar size={12} />
                  {r === 'week' ? 'Bu Hafta' : 'Bu Ay'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-black/30 border border-white/8 rounded-xl p-1">
              {classes.map(cls => (
                <button key={cls} onClick={() => setClassFilter(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    classFilter === cls ? 'bg-cyan-400 text-black' : 'text-zinc-500 hover:text-zinc-200'
                  }`}>
                  {cls === 'All' ? 'Tümü' : cls}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="text-purple-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { label: 'Toplam Rapor', value: filteredReports.length, color: 'text-purple-400' },
                { label: 'Farklı Öğrenci', value: Object.keys(studentCounts).length, color: 'text-cyan-400' },
                { label: 'Program Raporu', value: catCounts['Program'] || 0, color: 'text-cyan-400' },
                { label: 'Yemek Raporu', value: catCounts['Yemek'] || 0, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 backdrop-blur-xl border border-white/8 rounded-2xl p-5">
                  <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mb-2">{label}</p>
                  <p className={`text-4xl font-extrabold ${color}`}>{value}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily bar */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/8 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                  <Calendar size={14} className="text-cyan-400" />
                  Günlük Rapor Sayısı
                </h3>
                {dayData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dayData}>
                        <XAxis dataKey="day" tick={{ fill: '#52525b', fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#52525b', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-zinc-700 text-sm">Bu dönemde rapor yok.</div>
                )}
              </div>

              {/* Category pie */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/8 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                  <TrendingUp size={14} className="text-purple-400" />
                  Kategori Dağılımı
                </h3>
                {categoryData.length > 0 ? (
                  <div className="h-48 flex items-center">
                    <div className="flex-1 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                            {categoryData.map((entry, i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {categoryData.map(d => (
                        <div key={d.name} className="flex items-center gap-2 text-xs text-zinc-400">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[d.name] }} />
                          <span>{d.name}</span>
                          <span className="font-bold text-white">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-zinc-700 text-sm">Veri yok.</div>
                )}
              </div>
            </div>

            {/* Top Students + Recent Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top students */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/8 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">En Çok Rapor Girilen Öğrenciler</h3>
                <div className="space-y-3">
                  {topStudents.length > 0 ? topStudents.map(({ student, count }, i) => (
                    <div key={student?.id || i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">
                          {student ? `${student.name} ${student.surname}` : 'Bilinmeyen'}
                        </div>
                        {student?.class && <div className="text-[10px] text-zinc-600">{student.class}</div>}
                      </div>
                      <span className="text-sm font-extrabold text-purple-400">{count}</span>
                    </div>
                  )) : (
                    <p className="text-zinc-700 text-xs text-center py-8">Veri yok.</p>
                  )}
                </div>
              </div>

              {/* Recent reports */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/8 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Son Raporlar</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {filteredReports.slice(0, 10).map(report => {
                    const st = studentMap[report.student_id];
                    const Icon = CATEGORY_ICONS[report.category] || FileText;
                    const ts = report.created_at instanceof Timestamp
                      ? report.created_at.toDate().toLocaleString('tr-TR')
                      : typeof report.created_at === 'string'
                        ? new Date(report.created_at).toLocaleString('tr-TR')
                        : '';
                    return (
                      <div key={report.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="p-1.5 rounded-lg border shrink-0"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[report.category] || '#6b7280'}12`,
                            borderColor: `${CATEGORY_COLORS[report.category] || '#6b7280'}30`,
                          }}>
                          <Icon size={12} style={{ color: CATEGORY_COLORS[report.category] || '#9ca3af' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {st ? `${st.name} ${st.surname}` : '—'}
                            </span>
                            <span className="text-[10px] text-zinc-600 shrink-0">{ts}</span>
                          </div>
                          <p className="text-zinc-500 text-[11px] mt-0.5 truncate">{report.report_text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {filteredReports.length === 0 && (
                    <p className="text-zinc-700 text-xs text-center py-8">Bu dönemde rapor yok.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
