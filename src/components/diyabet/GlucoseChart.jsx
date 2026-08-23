'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine
} from 'recharts';
import { Activity, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const bg = data.glucose;

    let bgStatus = { text: 'Hedef Aralıkta', color: 'text-emerald-400', badge: 'bg-emerald-500/20 border-emerald-500/40' };
    if (bg < 54) bgStatus = { text: 'Ağır Hipoglisemi', color: 'text-rose-400', badge: 'bg-rose-500/20 border-rose-500/40' };
    else if (bg < 70) bgStatus = { text: 'Hipoglisemi', color: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/40' };
    else if (bg > 250) bgStatus = { text: 'Çok Yüksek', color: 'text-purple-400', badge: 'bg-purple-500/20 border-purple-500/40' };
    else if (bg > 180) bgStatus = { text: 'Yüksek', color: 'text-orange-400', badge: 'bg-orange-500/20 border-orange-500/40' };

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <div className="text-slate-400 font-semibold">{data.formattedTime || label}</div>
        <div className="flex items-center space-x-2">
          <span className="text-xl font-extrabold text-white">{bg}</span>
          <span className="text-slate-400">mg/dL</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${bgStatus.badge} ${bgStatus.color}`}>
            {bgStatus.text}
          </span>
        </div>
        {data.insulinUnits > 0 && (
          <div className="text-cyan-400 font-medium pt-1 flex items-center space-x-1">
            <span>💉 İnsülin: {data.insulinUnits} U</span>
            <span className="text-slate-400 text-[10px]">({data.insulinType || 'Bolus'})</span>
          </div>
        )}
        {data.carbs > 0 && (
          <div className="text-amber-400 font-medium flex items-center space-x-1">
            <span>🍞 Karbonhidrat: {data.carbs} g</span>
          </div>
        )}
        {data.notes && (
          <div className="text-slate-400 italic text-[11px] pt-1">"{data.notes}"</div>
        )}
      </div>
    );
  }
  return null;
};

export default function GlucoseChart({ records = [] }) {
  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    // Sort records by timestamp ascending
    const sorted = [...records]
      .filter(r => r.glucose !== null && r.glucose !== undefined)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return sorted.map(r => {
      const d = new Date(r.timestamp);
      const formattedTime = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      return {
        ...r,
        formattedTime: `${formattedDate} ${formattedTime}`,
        displayTime: formattedTime,
      };
    });
  }, [records]);

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[280px]">
        <Activity className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <p className="font-semibold text-slate-300">Henüz kan şekeri kaydı bulunmuyor.</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Grafik oluşturulabilmesi için yukarıdaki "Yeni Kayıt Ekle" butonundan kan şekeri ölçüm verilerinizi girin.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-2xl text-slate-950 shadow-md">
            <Activity className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center space-x-2">
              <span>Kan Şekeri Trendi (mg/dL)</span>
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full font-semibold">
                70-180 mg/dL Hedef Bant
              </span>
            </h3>
            <p className="text-xs text-slate-400">Son ölçümler ve zamana göre kan şekeri dalgalanması</p>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400"></span>
            <span className="text-slate-300 text-[11px]">Hedef (70-180)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400"></span>
            <span className="text-slate-300 text-[11px]">Düşük (&lt;70)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500/80 border border-orange-400"></span>
            <span className="text-slate-300 text-[11px]">Yüksek (&gt;180)</span>
          </div>
        </div>
      </div>

      {/* Recharts Area */}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Target Range Highlight (70 to 180) */}
            <ReferenceArea y1={70} y2={180} fill="#10b981" fillOpacity={0.08} strokeOpacity={0} />

            {/* Threshold Lines */}
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '70 (Hipo)', fill: '#ef4444', fontSize: 10, position: 'insideBottomLeft' }} />
            <ReferenceLine y={180} stroke="#f97316" strokeDasharray="3 3" label={{ value: '180 (Hiper)', fill: '#f97316', fontSize: 10, position: 'insideTopLeft' }} />

            <XAxis
              dataKey="displayTime"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              domain={[40, 300]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="glucose"
              stroke="#14b8a6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#glucoseGradient)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const bg = payload.glucose;
                let dotColor = '#10b981';
                if (bg < 70) dotColor = '#ef4444';
                else if (bg > 180) dotColor = '#f97316';

                return (
                  <circle
                    key={payload.id || cx}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={dotColor}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 8, stroke: '#14b8a6', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
