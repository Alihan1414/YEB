const fs = require('fs');

const content = `'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { RefreshCw, BookOpen, Star, Heart, Monitor, Maximize, Minimize, Sparkles, Menu } from 'lucide-react';

const HADITHS = [
  { text: "Bir topluluk Allah'\\u0131n evlerinden bir evde toplan\\u0131r, Allah'\\u0131n kitab\\u0131n\\u0131 okur ve onu aralar\\u0131nda m\\u00fcz\\u00e2kere ederlerse, \\u00fczerlerine sek\\u00eene iner, onlar\\u0131 rahmet kaplar, melekler etraflar\\u0131n\\u0131 ku\\u015fat\\u0131r.", source: "M\\u00fcslim, Zikir 38" },
  { text: "\\u0130lim \\u00f6\\u011frenmek her M\\u00fcsl\\u00fcmana farzd\\u0131r.", source: "\\u0130bn M\\u00e2ce, Mukaddime 17" },
  { text: "Sizin en hay\\u0131rl\\u0131n\\u0131z Kur'an'\\u0131 \\u00f6\\u011frenen ve \\u00f6\\u011fretendir.", source: "Buh\\u00e2r\\u00ee, Fez\\u00e2il\\u00fcl-Kur'\\u00e2n 21" },
  { text: "G\\u00fczel ahlak\\u0131 tamamlamak \\u00fczere g\\u00f6nderildim.", source: "Muvatta, H\\u00fcsnü'l-Huluk 8" },
  { text: "M\\u00fcmin, di\\u011fer m\\u00fcminlere bin\\u00e2n\\u0131n tu\\u011flalar\\u0131 gibidir; birbirini sa\\u011flamla\\u015ft\\u0131r\\u0131r.", source: "Buh\\u00e2r\\u00ee, Sal\\u00e2t 88" },
];

const MOTTOS = [
  { title: "\\u0130yilikle, bilgiyle ve sab\\u0131rla...", sub: "G\\u00fcn\\u00fcn her an\\u0131 de\\u011ferli olsun." },
  { title: "\\u00d6\\u011frenmek ibadet, \\u00f6\\u011fretmek sadakadir.", sub: "Her g\\u00fcn yeni bir ad\\u0131m at." },
  { title: "Sab\\u0131r ve azimle her zirve a\\u015f\\u0131l\\u0131r.", sub: "Ba\\u015farmak i\\u00e7in azmetmek yeter." },
  { title: "Kalpler ancak Allah'\\u0131n zikriyle huzur bulur.", sub: "Huzur ve bereket dileriz." },
  { title: "\\u0130lim \\u00f6\\u011frenmek be\\u015fikten mezara kadar d\\u0131r.", sub: "\\u00d6\\u011frenmeye asla dur deme." },
];

const G = '#c9a227';
const CARD = { background: 'linear-gradient(145deg,rgba(10,26,56,.92),rgba(6,16,38,.96))', border: '1px solid rgba(201,162,39,.45)', boxShadow: '0 0 0 1px rgba(201,162,39,.1),0 8px 40px rgba(0,0,0,.6)', backdropFilter: 'blur(20px)', borderRadius: 16 };

function Corner({ pos }) {
  const s = {};
  if (pos.includes('t')) s.top = 0; if (pos.includes('b')) s.bottom = 0;
  if (pos.includes('l')) s.left = 0; if (pos.includes('r')) s.right = 0;
  const r = { tl:'8px 0 0 0', tr:'0 8px 0 0', bl:'0 0 0 8px', br:'0 0 8px 0' }[pos];
  const bStyle = {};
  if (pos.includes('t')) bStyle.borderTop = '1.5px solid #c9a227';
  if (pos.includes('b')) bStyle.borderBottom = '1.5px solid #c9a227';
  if (pos.includes('l')) bStyle.borderLeft = '1.5px solid #c9a227';
  if (pos.includes('r')) bStyle.borderRight = '1.5px solid #c9a227';
  return <div style={{ position:'absolute', width:24, height:24, borderRadius:r, opacity:.6, pointerEvents:'none', ...s, ...bStyle }} />;
}

function GCard({ children, style={}, className='' }) {
  return (
    <div className={className} style={{ position:'relative', ...CARD, ...style }}>
      <Corner pos="tl"/><Corner pos="tr"/><Corner pos="bl"/><Corner pos="br"/>
      {children}
    </div>
  );
}

export default function TVPage() {
  const { user, institutionId, institutionName, logoUrl, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hadithIdx, setHadithIdx] = useState(0);
  const [mottoIdx, setMottoIdx] = useState(0);
  const [hadithVisible, setHadithVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissMobile, setDismissMobile] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 1024); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);
  const toggleFS = () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setIsFullscreen(true); } else { document.exitFullscreen?.().catch(() => {}); setIsFullscreen(false); } };
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);
  useEffect(() => {
    const i = setInterval(() => { setHadithVisible(false); setTimeout(() => { setHadithIdx(x => (x + 1) % HADITHS.length); setMottoIdx(x => (x + 1) % MOTTOS.length); setHadithVisible(true); }, 600); }, 12000);
    return () => clearInterval(i);
  }, []);

  const fetchData = useCallback(async () => {
    const id = institutionId || 'yamanevler';
    try {
      const [sr, rr] = await Promise.all([fetch('/api/students?institutionId=' + encodeURIComponent(id), { cache: 'no-store' }), fetch('/api/students/reports?institutionId=' + encodeURIComponent(id), { cache: 'no-store' })]);
      const [sd, rd] = await Promise.all([sr.json(), rr.json()]);
      if (sd.success && Array.isArray(sd.students)) setStudents(sd.students);
      if (rd.success && Array.isArray(rd.reports)) { const w = new Date(); w.setDate(w.getDate() - 7); setReports(rd.reports.filter(r => r.created_at && new Date(r.created_at) >= w)); }
      setLastRefresh(new Date());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [institutionId]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);
  useEffect(() => { if (!user) return; const i = setInterval(fetchData, 3000); return () => clearInterval(i); }, [user, fetchData]);
  useEffect(() => { const h = () => { if (document.visibilityState === 'visible' && user) fetchData(); }; document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [user, fetchData]);

  const catCounts = {};
  reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const recent = [...reports].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10);
  const hadith = HADITHS[hadithIdx];
  const motto = MOTTOS[mottoIdx];

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#020d1f 0%,#071938 40%,#0c2a5e 75%,#071228 100%)', color:'#fff', userSelect:'none', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', fontFamily:'Segoe UI,sans-serif' }}>

      {/* Mobile Warning */}
      {isMobile && !dismissMobile && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(2,8,20,.97)', backdropFilter:'blur(20px)', textAlign:'center' }}>
          <GCard style={{ maxWidth:360, width:'100%', padding:32 }}>
            <div style={{ width:64, height:64, margin:'0 auto 16px', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(201,162,39,.15)', border:'1px solid rgba(201,162,39,.4)' }}>
              <Monitor size={36} style={{ color:G }} />
            </div>
            <div style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.2em', color:G, marginBottom:8 }}>📺 TV Ekran\\u0131</div>
            <h2 style={{ fontSize:20, fontWeight:900, color:'#fff', marginBottom:12 }}>L\\u00fctfen Bilgisayar\\u0131n\\u0131zdan G\\u00f6r\\u00fcnt\\u00fcleyin</h2>
            <p style={{ fontSize:12, color:'#7a9bc0', lineHeight:1.6, marginBottom:16 }}>Bu panel geni\\u015f ekranlar i\\u00e7in tasarlanm\\u0131\\u015ft\\u0131r.</p>
            <button onClick={() => setDismissMobile(true)} style={{ width:'100%', padding:'12px 0', borderRadius:12, fontWeight:700, fontSize:14, background:'linear-gradient(135deg,#c9a227,#a07a1a)', color:'#fff', border:'none', cursor:'pointer' }}>
              Yine de Devam Et
            </button>
          </GCard>
        </div>
      )}

      <style>{\`
        @keyframes tvTwinkle{0%{opacity:.1;transform:scale(.7)}100%{opacity:.9;transform:scale(1.2)}}
        @keyframes tvPulse{0%,100%{box-shadow:0 0 0 0 rgba(201,162,39,.4)}50%{box-shadow:0 0 0 10px rgba(201,162,39,0)}}
        @keyframes tvMarquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
        @keyframes tvFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes tvBreathe{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
        @keyframes tvRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes tvShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes tvGlow{0%{opacity:.4}100%{opacity:.9}}
        @keyframes tvSwing{0%{transform:rotate(-5deg)}100%{transform:rotate(5deg)}}
        .tv-shimmer{background:linear-gradient(90deg,#c9a227,#f5e090 40%,#c9a227 60%,#e8c84a 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:tvShimmer 4s linear infinite}
        .tv-marquee{animation:tvMarquee 40s linear infinite}
        .tv-breathe{animation:tvBreathe 3.5s ease-in-out infinite}
        .tv-float1{animation:tvFloat 7s ease-in-out infinite}
        .tv-float2{animation:tvFloat 8s ease-in-out 1s infinite}
        .tv-float3{animation:tvFloat 6s ease-in-out .5s infinite}
        .tv-fade{transition:opacity .6s ease,transform .6s ease}
        .tv-hidden{opacity:0;transform:translateY(12px)}
        .tv-visible{opacity:1;transform:translateY(0)}
        .tv-swing-l{animation:tvSwing 4s ease-in-out infinite alternate;transform-origin:72px 28px}
        .tv-swing-r{animation:tvSwing 4s ease-in-out .5s infinite alternate;transform-origin:1368px 28px}
      \`}</style>

      {/* Stars */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
        {Array.from({length:65},(_,i)=>({ x:(i*17.3)%100, y:(i*13.7)%60, s:(i%3)*.8+.6, d:(i%4)+2 })).map((s,i) => (
          <div key={i} style={{ position:'absolute', borderRadius:'50%', background:'#fff', left:s.x+'%', top:s.y+'%', width:s.s, height:s.s, animation:'tvTwinkle '+s.d+'s ease-in-out '+(i*.07)+'s infinite alternate' }} />
        ))}
      </div>

      {/* Islamic SVG Background */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
        <svg viewBox="0 0 1440 900" style={{ width:'100%', height:'100%' }} preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="sg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#030f22" stopOpacity=".98"/>
              <stop offset="100%" stopColor="#010509" stopOpacity="1"/>
            </linearGradient>
            <filter id="gf">
              <feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Moon */}
          <circle cx="1100" cy="110" r="45" fill="#e8c84a" opacity=".12"/>
          <circle cx="1100" cy="110" r="30" fill="#f5d96a" opacity=".18"/>
          <circle cx="1118" cy="98" r="24" fill="#071938" opacity=".9"/>
          <polygon points="1148,98 1150,103 1156,103 1151,107 1153,112 1148,109 1143,112 1145,107 1141,103 1146,103" fill="#e8c84a" opacity=".65"/>
          {/* Background hills */}
          <path d="M0,710 Q250,660 500,690 Q720,720 960,670 Q1180,630 1440,660 L1440,900 L0,900 Z" fill="#040e20" opacity=".65"/>
          {/* Main Mosque (Sultanahmet style) */}
          <g fill="url(#sg)">
            <rect x="600" y="615" width="240" height="115"/>
            <path d="M620,615 Q720,535 820,615 Z"/>
            <path d="M590,640 Q620,608 650,640 Z"/>
            <path d="M790,640 Q820,608 850,640 Z"/>
            <rect x="580" y="640" width="40" height="90"/>
            <rect x="820" y="640" width="40" height="90"/>
            {/* Minarets */}
            <rect x="562" y="495" width="12" height="148"/>
            <path d="M559,495 Q568,474 577,495 Z"/>
            <line x1="568" y1="474" x2="568" y2="462" stroke="#c9a227" strokeWidth="1.5" opacity=".8"/>
            <circle cx="568" cy="461" r="2.5" fill="#c9a227" opacity=".9" filter="url(#gf)"/>
            <rect x="598" y="535" width="10" height="80"/>
            <path d="M595,535 Q603,518 611,535 Z"/>
            <line x1="603" y1="518" x2="603" y2="509" stroke="#c9a227" strokeWidth="1.2" opacity=".7"/>
            <rect x="832" y="535" width="10" height="80"/>
            <path d="M829,535 Q837,518 845,535 Z"/>
            <line x1="837" y1="518" x2="837" y2="509" stroke="#c9a227" strokeWidth="1.2" opacity=".7"/>
            <rect x="866" y="495" width="12" height="148"/>
            <path d="M863,495 Q872,474 881,495 Z"/>
            <line x1="872" y1="474" x2="872" y2="462" stroke="#c9a227" strokeWidth="1.5" opacity=".8"/>
            <circle cx="872" cy="461" r="2.5" fill="#c9a227" opacity=".9" filter="url(#gf)"/>
            {/* Windows */}
            <circle cx="660" cy="588" r="5" fill="#c9a227" opacity=".22" filter="url(#gf)"/>
            <circle cx="720" cy="572" r="6" fill="#c9a227" opacity=".28" filter="url(#gf)"/>
            <circle cx="780" cy="588" r="5" fill="#c9a227" opacity=".22" filter="url(#gf)"/>
            {/* Galata Tower */}
            <rect x="158" y="575" width="28" height="155"/>
            <path d="M155,575 Q172,555 189,575 Z"/>
            <line x1="172" y1="555" x2="172" y2="543" stroke="#c9a227" strokeWidth="1.5" opacity=".8"/>
            <rect x="150" y="594" width="44" height="4" rx="1" fill="#c9a227" opacity=".3"/>
            <circle cx="172" cy="605" r="2" fill="#c9a227" opacity=".45" filter="url(#gf)"/>
            {/* Kiz Kulesi */}
            <path d="M1240,740 Q1268,725 1296,740 Z"/>
            <rect x="1254" y="704" width="22" height="37"/>
            <rect x="1260" y="678" width="10" height="27"/>
            <path d="M1257,678 Q1265,663 1273,678 Z"/>
            <line x1="1265" y1="663" x2="1265" y2="653" stroke="#c9a227" strokeWidth="1.2" opacity=".7"/>
          </g>
          {/* Left Lantern */}
          <g className="tv-swing-l">
            <line x1="72" y1="28" x2="72" y2="48" stroke="#c9a227" strokeWidth="1" opacity=".7"/>
            <path d="M62,48 Q59,60 61,76 L83,76 Q85,60 82,48 Z" fill="#0a1f3d" stroke="#c9a227" strokeWidth="1.2" opacity=".9"/>
            <path d="M61,48 L83,48 L81,43 L63,43 Z" fill="#c9a227" opacity=".8"/>
            <path d="M61,76 L83,76 L81,82 L63,82 Z" fill="#c9a227" opacity=".7"/>
            <ellipse cx="72" cy="62" rx="8" ry="10" fill="rgba(255,200,50,.22)"/>
            <ellipse cx="72" cy="62" rx="4" ry="6" fill="rgba(255,220,80,.38)" style={{animation:'tvGlow 2s ease-in-out infinite alternate'}}/>
          </g>
          {/* Right Lantern */}
          <g className="tv-swing-r">
            <line x1="1368" y1="28" x2="1368" y2="48" stroke="#c9a227" strokeWidth="1" opacity=".7"/>
            <path d="M1358,48 Q1355,60 1357,76 L1379,76 Q1381,60 1378,48 Z" fill="#0a1f3d" stroke="#c9a227" strokeWidth="1.2" opacity=".9"/>
            <path d="M1357,48 L1379,48 L1377,43 L1359,43 Z" fill="#c9a227" opacity=".8"/>
            <path d="M1357,76 L1379,76 L1377,82 L1359,82 Z" fill="#c9a227" opacity=".7"/>
            <ellipse cx="1368" cy="62" rx="8" ry="10" fill="rgba(255,200,50,.22)"/>
            <ellipse cx="1368" cy="62" rx="4" ry="6" fill="rgba(255,220,80,.38)" style={{animation:'tvGlow 2s ease-in-out .3s infinite alternate'}}/>
          </g>
          {/* Shore */}
          <path d="M0,768 Q200,752 400,768 Q640,788 860,762 Q1080,742 1300,760 Q1390,768 1440,758 L1440,900 L0,900 Z" fill="#030b1b"/>
          <rect x="0" y="818" width="1440" height="82" fill="#050f20" opacity=".9"/>
          <line x1="0" y1="758" x2="1440" y2="758" stroke="#c9a227" strokeWidth=".4" opacity=".18"/>
        </svg>
      </div>

      {/* HEADER */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:40, height:40, borderRadius:12, background:'rgba(201,162,39,.12)', border:'1px solid rgba(201,162,39,.35)', cursor:'pointer', border:'none', outline:'none' }}>
            <Menu size={18} style={{ color:G }}/>
          </button>
          <div style={{ width:48, height:48, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'rgba(201,162,39,.12)', border:'1px solid rgba(201,162,39,.4)', boxShadow:'0 0 20px rgba(201,162,39,.2)', animation:'tvPulse 3s ease-in-out infinite' }}>
            <img src={logoUrl||'/logo.png'} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }}/>
          </div>
          <div>
            <h1 className="tv-shimmer" style={{ fontWeight:900, fontSize:'1.25rem', lineHeight:1, margin:0 }}>
              {institutionName || 'Sistem Y\\u00f6netimi'}
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
              <span className="tv-breathe" style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', display:'inline-block' }}/>
              <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(160,180,208,.8)' }}>
                Birlikte \\u00f6\\u011freniyor, birlikte geli\\u015fiyoruz.
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:2, fontFamily:'Courier New,monospace' }}>
              <span style={{ fontWeight:900, fontSize:'3rem', letterSpacing:'-.02em', color:'#fff', textShadow:'0 0 30px rgba(201,162,39,.7)' }}>
                {time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
              </span>
              <span style={{ fontSize:'1.8rem', color:G, fontWeight:900, textShadow:'0 0 20px rgba(201,162,39,.8)' }}>
                :{String(time.getSeconds()).padStart(2,'0')}
              </span>
            </div>
            <div style={{ color:'#a0b4d0', fontSize:'.68rem', fontWeight:600, marginTop:1, letterSpacing:'.04em' }}>
              {time.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'})}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <button onClick={toggleFS} style={{ padding:8, borderRadius:10, background:'rgba(201,162,39,.1)', border:'1px solid rgba(201,162,39,.25)', cursor:'pointer' }}>
              {isFullscreen ? <Minimize size={14} style={{color:G}}/> : <Maximize size={14} style={{color:G}}/>}
            </button>
            <button onClick={fetchData} style={{ padding:8, borderRadius:10, background:'rgba(201,162,39,.1)', border:'1px solid rgba(201,162,39,.25)', cursor:'pointer' }}>
              <RefreshCw size={14} style={{color:G}} className={loading?'animate-spin':''}/>
            </button>
          </div>
        </div>
      </div>

      {/* Gold divider */}
      <div style={{ position:'relative', zIndex:10, margin:'0 24px', height:1, background:'linear-gradient(90deg,transparent,rgba(201,162,39,.6) 30%,rgba(201,162,39,.6) 70%,transparent)' }}/>

      {/* MAIN GRID */}
      <div style={{ position:'relative', zIndex:10, flex:1, display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:16, padding:'16px 24px 12px', minHeight:0 }}>

        {/* LEFT COL - Student Counter */}
        <div style={{ gridColumn:'span 3', display:'flex', flexDirection:'column', gap:12 }}>
          <GCard className="tv-float1" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:16, background:'radial-gradient(ellipse at 50% 80%,rgba(201,162,39,.08) 0%,transparent 60%)', pointerEvents:'none' }}/>
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, width:160, height:160 }}>
              <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', animation:'tvRotate 10s linear infinite' }}>
                <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(201,162,39,.2)" strokeWidth="1" strokeDasharray="5 4"/>
                <circle cx="80" cy="80" r="72" fill="none" stroke="#c9a227" strokeWidth="2.5" strokeDasharray="40 430" strokeLinecap="round"/>
              </svg>
              <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', animation:'tvRotate 6s linear infinite reverse' }}>
                <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(201,162,39,.15)" strokeWidth="1" strokeDasharray="3 7"/>
              </svg>
              <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontWeight:900, color:'#fff', fontSize:'3.8rem', lineHeight:1, textShadow:'0 0 40px rgba(201,162,39,.8)' }}>{students.length}</div>
                <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', marginTop:4, color:G }}>Aktif \\u00d6\\u011frenci</div>
              </div>
            </div>
            <div className="tv-breathe" style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:700, background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', color:'#34d399' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', display:'inline-block' }}/>
              Canl\\u0131 Senkronize
            </div>
          </GCard>
          <GCard style={{ padding:16, textAlign:'center', animation:'none' }}>
            <div style={{ fontWeight:900, fontSize:'1.8rem', color:G, textShadow:'0 0 20px rgba(201,162,39,.5)' }}>{reports.length}</div>
            <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', marginTop:4, color:'#7a9bc0' }}>Bu Hafta Girilen Rapor</div>
          </GCard>
        </div>

        {/* CENTER COL - Hadith */}
        <div style={{ gridColumn:'span 6' }}>
          <GCard className="tv-float2" style={{ height:'100%', display:'flex', flexDirection:'column', padding:24 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:16, background:'radial-gradient(ellipse at 50% 0%,rgba(201,162,39,.1) 0%,transparent 60%)', pointerEvents:'none' }}/>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:16 }}>
              <div className="tv-breathe" style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8, background:'rgba(201,162,39,.15)', border:'1px solid rgba(201,162,39,.4)' }}>
                <BookOpen size={20} style={{color:G}}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.15em', color:G }}>
                <Sparkles size={12} style={{color:G}}/>
                G\\u00fcn\\u00fcn Hadis-i \\u015eerifi
                <Sparkles size={12} style={{color:G}}/>
              </div>
            </div>
            <div className={'tv-fade ' + (hadithVisible?'tv-visible':'tv-hidden')} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center', padding:'0 8px' }}>
                <div style={{ fontFamily:'serif', fontSize:'3rem', lineHeight:1, marginBottom:4, color:'rgba(201,162,39,.35)' }}>&ldquo;</div>
                <p style={{ fontFamily:'serif', fontStyle:'italic', lineHeight:1.7, color:'#dde8f5', fontSize:'1.05rem', textShadow:'0 2px 15px rgba(0,0,0,.5)', margin:0 }}>{hadith.text}</p>
                <div style={{ fontFamily:'serif', fontSize:'3rem', lineHeight:1, marginTop:4, color:'rgba(201,162,39,.35)' }}>&rdquo;</div>
              </div>
            </div>
            <div className={'tv-fade ' + (hadithVisible?'tv-visible':'tv-hidden')} style={{ paddingTop:12, borderTop:'1px solid rgba(201,162,39,.2)', display:'flex', justifyContent:'center' }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'4px 16px', borderRadius:20, color:G, background:'rgba(201,162,39,.12)', border:'1px solid rgba(201,162,39,.3)' }}>{hadith.source}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:12 }}>
              {HADITHS.map((_,i) => <div key={i} style={{ borderRadius:4, transition:'all .3s', width:i===hadithIdx?20:7, height:7, background:i===hadithIdx?G:'rgba(201,162,39,.25)' }}/>)}
            </div>
          </GCard>
        </div>

        {/* RIGHT COL - Motto + Categories */}
        <div style={{ gridColumn:'span 3', display:'flex', flexDirection:'column', gap:12 }}>
          <GCard className="tv-float3" style={{ flex:1, display:'flex', flexDirection:'column', padding:20 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:16, background:'radial-gradient(ellipse at 80% 20%,rgba(139,92,246,.08) 0%,transparent 60%)', pointerEvents:'none' }}/>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <Heart size={20} style={{ color:'#f472b6', animation:'tvBreathe 3s ease-in-out infinite' }}/>
            </div>
            <div className={'tv-fade ' + (hadithVisible?'tv-visible':'tv-hidden')} style={{ flex:1 }}>
              <h3 style={{ fontWeight:900, fontSize:'1.1rem', color:'#fff', lineHeight:1.3, marginBottom:8, textShadow:'0 0 25px rgba(201,162,39,.3)', margin:'0 0 8px' }}>{motto.title}</h3>
              <div style={{ width:40, height:1, background:'linear-gradient(90deg,#c9a227,transparent)', marginBottom:8 }}/>
              <p style={{ fontSize:13, lineHeight:1.6, color:'#7a9bc0', margin:0 }}>{motto.sub}</p>
            </div>
            <div style={{ marginTop:'auto', paddingTop:12 }}>
              <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.2em', color:'rgba(201,162,39,.4)' }}>G\\u00fcn\\u00fcn Mesaj\\u0131</div>
            </div>
          </GCard>
          <GCard style={{ padding:16, animation:'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:G, marginBottom:12 }}>
              <Star size={12} style={{color:G}}/>Kategori Da\\u011f\\u0131l\\u0131m\\u0131
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Object.entries(catCounts).slice(0,3).map(([cat,cnt]) => {
                const t = reports.length || 1;
                const p = Math.round(cnt/t*100);
                return (
                  <div key={cat}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, marginBottom:4 }}>
                      <span style={{ fontWeight:600, color:'#a0b4d0' }}>{cat}</span>
                      <span style={{ fontWeight:900, fontSize:10, color:G }}>{cnt} rapor (%{p})</span>
                    </div>
                    <div style={{ height:6, borderRadius:4, overflow:'hidden', background:'rgba(255,255,255,.08)' }}>
                      <div style={{ height:'100%', borderRadius:4, transition:'all 1s', width:p+'%', background:'linear-gradient(90deg,#c9a227,#f5a623)' }}/>
                    </div>
                  </div>
                );
              })}
              {Object.keys(catCounts).length===0 && <p style={{ fontSize:11, textAlign:'center', padding:'8px 0', color:'rgba(120,154,192,.5)', margin:0 }}>Hen\\u00fcz rapor yok</p>}
            </div>
          </GCard>
        </div>
      </div>

      {/* BOTTOM 3 CARDS */}
      <div style={{ position:'relative', zIndex:10, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, padding:'0 24px 12px' }}>
        {[
          { icon:<BookOpen size={22} style={{color:G}}/>, bg:'rgba(201,162,39,.12)', bdr:'rgba(201,162,39,.35)', title:'\\u0130lim ve Bilgi', sub:'Her g\\u00fcn yeni bir ders, gelece\\u011fe at\\u0131lan sa\\u011flam bir ad\\u0131md\\u0131r.' },
          { icon:<Heart size={22} style={{color:'#34d399'}}/>, bg:'rgba(16,185,129,.1)', bdr:'rgba(16,185,129,.3)', title:'\\u0130yilik ve Ahlak', sub:'\\u0130yili\\u011fi payla\\u015f, g\\u00fczel ahlak\\u0131 hayat\\u0131n\\u0131n merkezine al.' },
          { icon:<Star size={22} style={{color:'#a78bfa'}}/>, bg:'rgba(139,92,246,.1)', bdr:'rgba(139,92,246,.3)', title:'Azim ve \\u0130stikrar', sub:'Disiplinle \\u00e7al\\u0131\\u015f, s\\u00fcrekli kendini geli\\u015ftirmeye devam et.' },
        ].map((c,i) => (
          <div key={i} style={{ position:'relative', borderRadius:16, display:'flex', alignItems:'center', gap:16, padding:16, background:'linear-gradient(145deg,rgba(10,26,56,.92),rgba(6,16,38,.96))', border:'1px solid rgba(201,162,39,.35)', boxShadow:'0 0 0 1px rgba(201,162,39,.08),0 6px 30px rgba(0,0,0,.5)', backdropFilter:'blur(20px)' }}>
            <div style={{ position:'absolute', top:0, left:0, width:20, height:20, borderTop:'1.5px solid #c9a227', borderLeft:'1.5px solid #c9a227', borderRadius:'6px 0 0 0', opacity:.5, pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:0, right:0, width:20, height:20, borderBottom:'1.5px solid #c9a227', borderRight:'1.5px solid #c9a227', borderRadius:'0 0 6px 0', opacity:.5, pointerEvents:'none' }}/>
            <div className="tv-breathe" style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:c.bg, border:'1px solid '+c.bdr, animationDelay:i*.4+'s' }}>{c.icon}</div>
            <div>
              <div style={{ fontWeight:900, fontSize:13, color:'#fff' }}>{c.title}</div>
              <div style={{ fontSize:11, marginTop:2, lineHeight:1.5, color:'#7a9bc0' }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* LIVE TICKER */}
      <div style={{ position:'relative', zIndex:10, margin:'0 24px 12px', borderRadius:12, overflow:'hidden', display:'flex', alignItems:'center', height:42, background:'rgba(4,12,28,.9)', border:'1px solid rgba(201,162,39,.3)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 16px', height:'100%', flexShrink:0, fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.15em', background:'linear-gradient(135deg,#c9a227,#a07a1a)', color:'#fff', minWidth:110 }}>
          <span className="tv-breathe" style={{ width:8, height:8, borderRadius:'50%', background:'#fff', display:'inline-block' }}/>
          CANLI AKI\\u015e
        </div>
        <div style={{ flex:1, overflow:'hidden', height:'100%', display:'flex', alignItems:'center' }}>
          <div className="tv-marquee" style={{ whiteSpace:'nowrap', fontSize:12, display:'flex', alignItems:'center', gap:24, color:'#a0b4d0' }}>
            {recent.length>0 ? recent.map((r,i) => (
              <span key={r.id||i} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:800, color:G }}>{r.student_name||'\\u00d6\\u011frenci'}</span>
                <span>{r.content?.slice(0,70)}{r.content?.length>70?'...':''}</span>
                <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700, background:'rgba(201,162,39,.15)', border:'1px solid rgba(201,162,39,.3)', color:G }}>{r.category}</span>
                <span style={{ color:'rgba(201,162,39,.4)', margin:'0 4px' }}>◆</span>
              </span>
            )) : <span>Sistem aktif · \\u00d6\\u011frenci takip ve canl\\u0131 raporlama ekran\\u0131 yay\\u0131nda · Eklenen raporlar anında buraya yans\\u0131yacak</span>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 16px', height:'100%', flexShrink:0, borderLeft:'1px solid rgba(201,162,39,.2)', fontSize:10, fontFamily:'monospace', color:'rgba(201,162,39,.6)' }}>
          <span className="tv-breathe" style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', display:'inline-block' }}/>
          {lastRefresh.toLocaleTimeString('tr-TR')}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ position:'relative', zIndex:10, paddingBottom:12, textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.3em', color:'rgba(201,162,39,.5)' }}>
          <span>\\u0130lim</span><span style={{color:'rgba(201,162,39,.25)'}}>•</span>
          <span>\\u0130yilik</span><span style={{color:'rgba(201,162,39,.25)'}}>•</span>
          <span>\\u0130stikrar</span>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/tv/page.js', content, 'utf8');
console.log('SUCCESS - Written', content.length, 'bytes');