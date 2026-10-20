/**
 * aiMatcher.js — Türkçe doğal dil öğrenci / grup / bölüm eşleştirme motoru.
 *
 * Hızlı, bağımlılıksız ve sunucuda çalışır (eski telefonları yormaz).
 * Anlar:
 *   - Grup adları + ekleri: "Aldemir", "Aldemir'in talebeleri", "Aldemirgil", "Mısırlılar", "Serkan hocanın grubu"
 *   - Aynı isimli gruplar: "Hazırlık Çetinkaya" / "İhzari Çetinkaya" / "Mustafa Çetinkaya" / "İbrahim hoca"
 *   - Bölümler: "Hazırlık", "İbtidailer", "İhzari", "Tekamül altı", "Kuran-ı Kerim"
 *   - Tam isim, sadece ad, sadece soyad (+ Türkçe ekler, ses tanıma hataları)
 *   - Hariç tutma: "Aldemir grubu namazdaydı, Emirhan hariç"
 *   - Kapsam: "Güney grubundan Kerem ile Ahmet gelmedi" → sadece o iki talebe
 *   - Herkes: "bütün talebeler", "herkes"
 */

// ─── Normalizasyon ───────────────────────────────────────────────────────────
export function trClean(str) {
  if (!str) return '';
  return String(str)
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o')
    .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const collapse = (s) => (s || '').replace(/(.)\1+/g, '$1');

function lev(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Türkçe isim çekim ekleri (normalize edilmiş: ı→i, ü→u ...)
const SUFFIX_RE = /^(y|n|s)?(i|u|e|a|in|un|nin|nun|ye|ya|de|da|te|ta|den|dan|ten|tan|deki|daki|teki|taki|le|la|yle|yla|ler|lar|leri|lari|lerin|larin|lere|lara|lerde|larda|lerden|lardan|lerdeki|lardaki|gil|giller|gile|gilin|gillerin|ciler|cilar)?(in|un|e|a|i|u|de|da|den|dan|nin|nun|ndan|nden|ki)?$/;
const ABLATIVE_RE = /(den|dan|ten|tan|ndan|nden)$/;

/**
 * Bir girdi kelimesi hedef kelimeye uyuyor mu?
 * strict=true → sadece tam eşleşme + ek (bulanıklık yok)
 */
export function wordMatch(input, target, strict = false) {
  if (!input || !target) return false;
  if (input === target) return true;
  if (target.length >= 3 && input.startsWith(target) && SUFFIX_RE.test(input.slice(target.length))) return true;
  const ci = collapse(input), ct = collapse(target);
  if (ci === ct) return true;
  if (ct.length >= 3 && ci.startsWith(ct) && SUFFIX_RE.test(ci.slice(ct.length))) return true;
  if (strict) return false;
  // Ses tanıma / yazım hatası toleransı
  const maxLen = Math.max(ci.length, ct.length);
  if (maxLen < 4) return false;
  const allowed = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
  if (Math.abs(ci.length - ct.length) <= allowed && lev(ci, ct) <= allowed) return true;
  // Ekli + hatalı ("mısırlılarınn")
  if (ci.length > ct.length) {
    const head = ci.slice(0, ct.length);
    if (lev(head, ct) <= (ct.length <= 5 ? 1 : 2) && SUFFIX_RE.test(ci.slice(ct.length))) return true;
  }
  return false;
}

const GROUP_CONTEXT = new Set(['grup', 'grubu', 'grubun', 'grubunu', 'grubuna', 'grubunda', 'grubundan', 'grubundaki', 'grubunun',
  'gruptan', 'grupta', 'gruptaki', 'ekibi', 'ekip', 'ekibinden', 'hoca', 'hocanin', 'hocam', 'hocamin', 'hocadan', 'hocanin',
  'talebeleri', 'talebeler', 'talebelerinden', 'talebelerin', 'ogrencileri', 'ogrenciler', 'ogrencilerinden', 'sinifi', 'sinif',
  'sinifindan', 'sinifindaki', 'takimi', 'cocuklari', 'cocuklar', 'tayfasi', 'icinden', 'arasindan']);
const FILLER = new Set(['adli', 'isimli', 'olan', 'kardesimiz', 'kardes', 'talebe', 'ogrenci', 'arkadas', 'arkadaslar', 'abi', 'efendi']);
const EXCLUDE = new Set(['haric', 'harici', 'haricinde', 'haricindekiler', 'disinda', 'disindakiler', 'disindaki', 'olmadan', 'muaf']);
const CONNECT = new Set(['ve', 'ile', 'de', 'da', 'veya', 'yada', 'bir', 'birde']);
const ALL_RE = /\b(herkes|herkesi|herkesin|tum talebeler\w*|butun talebeler\w*|tum ogrenciler\w*|butun ogrenciler\w*|tum kurum|butun kurum|tum yurt|butun yurt|bizim butun|kurumun tamami)\b/;

// Bölüm eş anlamlıları (öğrencinin "class" alanı ile eşleşir)
const SECTION_SYNONYMS = [
  { test: /hazirlik/, keys: [['hazirlik']] },
  { test: /ibtidai/, keys: [['ibtidai'], ['iptidai'], ['ibdidai']] },
  { test: /ihzari/, keys: [['ihzari'], ['ihzariler'], ['izhari']] },
  { test: /tekamul/, keys: [['tekamul', 'alti'], ['tekamul']] },
  { test: /^muh/, keys: [['muhafaza'], ['muh', 'kerim'], ['muhafaza', 'kerim']] },
  { test: /^k\s*kerim|^kuran/, keys: [['kuran', 'kerim'], ['kurani', 'kerim'], ['kuran', 'i', 'kerim'], ['kurancilar']] },
];

// ─── Tokenizasyon (orijinal kelimeye bire bir eşlenir) ──────────────────────
function tokenize(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  return words.map((w, i) => {
    const clean = trClean(w);
    const parts = clean.split(' ').filter(Boolean);
    return {
      i,
      raw: w,
      t: parts.join(''),             // "kuran-ı" → "kurani"
      boundaryAfter: /[,.;:!?]$/.test(w),
    };
  });
}

function nameTokens(str) {
  return trClean(str).split(' ').filter(t => t.length >= 2);
}

// ─── Ana motor ───────────────────────────────────────────────────────────────
/**
 * @param {string} text
 * @param {{id:string, fullName?:string, name?:string, surname?:string, class?:string}[]} studentsIn
 * @param {{id:string, name:string, section?:string, aliases?:string[], teacher_name?:string, student_ids?:string[]}[]} groupsIn
 */
export function analyzeText(text, studentsIn = [], groupsIn = []) {
  const toks = tokenize(text);
  const n = toks.length;
  const used = new Array(n).fill(false);
  const students = studentsIn.map(s => {
    const full = (s.fullName || `${s.name || ''} ${s.surname || ''}`).trim();
    const nt = nameTokens(full);
    const surnameT = s.surname ? nameTokens(s.surname) : nt.slice(-1);
    const firstT = s.name ? nameTokens(s.name) : nt.slice(0, Math.max(1, nt.length - 1));
    return { id: String(s.id), fullName: full, class: s.class || '', nt, firstT, surnameT };
  });
  const byId = new Map(students.map(s => [s.id, s]));
  const allNameTokens = new Set(students.flatMap(s => s.nt));

  const spanFree = (start, len) => {
    for (let k = start; k < start + len; k++) if (k >= n || used[k]) return false;
    return true;
  };
  const markUsed = (start, len) => { for (let k = start; k < start + len; k++) used[k] = true; };
  const seqMatch = (start, keyToks, strictLast = false) => {
    for (let k = 0; k < keyToks.length; k++) {
      const strict = strictLast || keyToks[k].length <= 3;
      if (!wordMatch(toks[start + k].t, keyToks[k], strict)) return false;
    }
    return true;
  };

  const studentHits = [];      // { id, start, len, kind }
  const groupHits = [];        // { ids:[groupId], start, len }
  const sectionHits = [];      // { section, start, len }
  const ambiguous = [];        // { word, candidates:[names] }
  const notes = [];

  // 1) Tam isimler (en uzun önce) — ad+soyad, en az 2 kelime
  const fullKeys = [];
  students.forEach(s => {
    if (s.nt.length >= 2) fullKeys.push({ s, toks: s.nt });
    // "Ahmet Öksün" gibi ilk ad + soyad kısaltması
    if (s.firstT.length >= 2 && s.surnameT.length) fullKeys.push({ s, toks: [s.firstT[0], ...s.surnameT] });
    // "Ahmet Yiğit" gibi çift isim (soyadsız) — tekil eşleşme gibi değerlendirilecek, burada değil
  });
  fullKeys.sort((a, b) => b.toks.length - a.toks.length);
  for (const fk of fullKeys) {
    for (let i = 0; i + fk.toks.length <= n; i++) {
      if (!spanFree(i, fk.toks.length)) continue;
      if (seqMatch(i, fk.toks)) {
        studentHits.push({ id: fk.s.id, start: i, len: fk.toks.length, kind: 'full' });
        markUsed(i, fk.toks.length);
      }
    }
  }

  // 2) Gruplar
  const groupKeys = [];
  groupsIn.forEach(g => {
    const addKey = (str, strong) => {
      const kt = nameTokens(str).filter(t => t.length >= 2);
      if (!kt.length) return;
      groupKeys.push({ g, toks: kt, strong });
    };
    addKey(g.name, false);
    (g.aliases || []).forEach(a => addKey(a, true));
    if (g.teacher_name) {
      addKey(g.teacher_name, true);
      const tt = nameTokens(g.teacher_name);
      if (tt.length >= 2) addKey(`${tt[0]} hoca`, true);
    }
  });
  groupKeys.sort((a, b) => b.toks.length - a.toks.length || (b.strong ? 1 : 0) - (a.strong ? 1 : 0));

  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    let best = null;
    for (const gk of groupKeys) {
      if (!spanFree(i, gk.toks.length)) continue;
      // Tek kelimelik grup adları kısa ise bulanık eşleşme yok (Güney ≠ Güneş)
      const strict = gk.toks.length === 1 && gk.toks[0].length <= 6;
      if (!seqMatch(i, gk.toks, strict)) continue;
      // Tek kelimelik grup anahtarı bir talebe adıyla da çakışıyorsa bağlam iste
      if (gk.toks.length === 1 && allNameTokens.has(gk.toks[0])) {
        const ctx = (toks[i + 1] && GROUP_CONTEXT.has(toks[i + 1].t)) || /(gil|giller|lar|ler|larin|lerin)$/.test(toks[i].t);
        if (!ctx) continue;
      }
      if (!best || gk.toks.length > best.len) best = { len: gk.toks.length, matches: [gk] };
      else if (gk.toks.length === best.len) best.matches.push(gk);
    }
    if (!best) continue;
    let gIds = [...new Set(best.matches.map(m => m.g.id))];
    markUsed(i, best.len);
    let end = i + best.len;

    // Aynı adlı gruplar → komşu kelimelerden ayırt et (bölüm adı / hoca adı)
    if (gIds.length > 1) {
      const cands = gIds.map(id => groupsIn.find(g => g.id === id));
      const near = [];
      for (let k = Math.max(0, i - 3); k < Math.min(n, end + 3); k++) if (!used[k] || k < i || k >= end) near.push(k);
      const pick = cands.filter(g => {
        const words = [...nameTokens(g.section || ''), ...nameTokens(g.teacher_name || '').slice(0, 1),
          ...(g.aliases || []).flatMap(a => nameTokens(a)).filter(t => t.length >= 4 && !nameTokens(g.name).includes(t))];
        return near.some(k => words.some(w => w.length >= 4 && wordMatch(toks[k].t, w)));
      });
      if (pick.length >= 1 && pick.length < cands.length) {
        gIds = pick.map(g => g.id);
        // ayırt edici kelimeleri tüket
        near.forEach(k => {
          if (used[k]) return;
          const words = pick.flatMap(g => [...nameTokens(g.section || ''), ...nameTokens(g.teacher_name || '').slice(0, 1)]);
          if (words.some(w => w.length >= 4 && wordMatch(toks[k].t, w))) used[k] = true;
        });
      } else {
        notes.push(`"${cands[0].name}" adında ${cands.length} grup var (${cands.map(c => c.section || c.id).join(' / ')}). Hangisi olduğunu söylemezseniz hepsi seçilir.`);
      }
    }

    // Grup bağlam kelimelerini tüket ("grubu", "hocanın", "talebeleri"...)
    let ablative = ABLATIVE_RE.test(toks[end - 1].t);
    while (end < n && !used[end] && (GROUP_CONTEXT.has(toks[end].t) || FILLER.has(toks[end].t))) {
      if (ABLATIVE_RE.test(toks[end].t) || /^(icinden|arasindan)$/.test(toks[end].t)) ablative = true;
      used[end] = true;
      end++;
    }
    groupHits.push({ ids: gIds, start: i, len: end - i, ablative });
  }

  // 3) Bölümler (Hazırlık, İbtidai...)
  const sectionNames = [...new Set(students.map(s => s.class).filter(Boolean))];
  const sectionKeys = [];
  sectionNames.forEach(sec => {
    const ct = trClean(sec);
    const syn = SECTION_SYNONYMS.find(x => x.test.test(ct));
    const keys = syn ? syn.keys : [nameTokens(sec).filter(t => t.length >= 3)];
    keys.forEach(k => k.length && sectionKeys.push({ sec, toks: k }));
  });
  sectionKeys.sort((a, b) => b.toks.length - a.toks.length);
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    for (const sk of sectionKeys) {
      if (!spanFree(i, sk.toks.length) || !seqMatch(i, sk.toks)) continue;
      if (sk.toks.length === 1 && allNameTokens.has(sk.toks[0])) {
        const ctx = toks[i + 1] && GROUP_CONTEXT.has(toks[i + 1].t);
        if (!ctx) continue;
      }
      let end = i + sk.toks.length;
      markUsed(i, sk.toks.length);
      while (end < n && !used[end] && (GROUP_CONTEXT.has(toks[end].t) || /^(sinifi|bolumu|kismi|seviyesi)$/.test(toks[end].t))) { used[end] = true; end++; }
      sectionHits.push({ section: sk.sec, start: i, len: end - i });
      break;
    }
  }

  // 4) Tekil ad / soyad eşleşmeleri
  const groupMemberSet = new Set(groupHits.flatMap(h => h.ids).flatMap(id => (groupsIn.find(g => g.id === id)?.student_ids || [])));
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    const w = toks[i].t;
    if (w.length < 3 || CONNECT.has(w) || EXCLUDE.has(w) || GROUP_CONTEXT.has(w)) continue;
    const cands = [];
    for (const s of students) {
      // Çift isim ("ahmet yigit") — iki kelime
      if (s.firstT.length >= 2 && i + s.firstT.length <= n && spanFree(i, s.firstT.length) && seqMatch(i, s.firstT)) {
        cands.push({ s, len: s.firstT.length, score: 85 });
        continue;
      }
      const sur = s.surnameT[s.surnameT.length - 1];
      if (sur && sur.length >= 4 && wordMatch(w, sur, sur.length <= 5)) { cands.push({ s, len: 1, score: 75 }); continue; }
      const first = s.firstT[0];
      if (first && first.length >= 3 && wordMatch(w, first, first.length <= 5)) cands.push({ s, len: 1, score: 60 });
    }
    if (!cands.length) continue;
    const top = Math.max(...cands.map(c => c.score + c.len * 10));
    let best = cands.filter(c => c.score + c.len * 10 === top);
    // Grup bağlamı varsa önce grup üyelerine daralt
    if (best.length > 1 && groupMemberSet.size) {
      const inGrp = best.filter(c => groupMemberSet.has(c.s.id));
      if (inGrp.length) best = inGrp;
    }
    // Bölüm bağlamı
    if (best.length > 1 && sectionHits.length) {
      const secs = new Set(sectionHits.map(h => h.section));
      const inSec = best.filter(c => secs.has(c.s.class));
      if (inSec.length) best = inSec;
    }
    if (best.length === 1) {
      studentHits.push({ id: best[0].s.id, start: i, len: best[0].len, kind: 'single' });
      markUsed(i, best[0].len);
    } else if (best.length > 1) {
      ambiguous.push({ word: toks[i].raw, candidates: best.map(c => c.s.fullName) });
      markUsed(i, best[0].len);
    }
  }

  // 5) Hariç tutma ve kapsam
  const excludeIdx = toks.findIndex((tk, i) => EXCLUDE.has(tk.t) || (tk.t === 'haric' && !used[i]));
  const excluded = new Set();
  if (excludeIdx !== -1) {
    used[excludeIdx] = true;
    // Hariç kelimesinden önceki (son gruptan / noktalamadan sonraki) talebeler hariç
    let segStart = 0;
    for (const gh of groupHits) if (gh.start + gh.len <= excludeIdx) segStart = Math.max(segStart, gh.start + gh.len);
    for (let k = excludeIdx - 1; k >= segStart; k--) if (toks[k].boundaryAfter && k < excludeIdx - 1) { segStart = Math.max(segStart, k + 1); break; }
    studentHits.forEach(h => { if (h.start >= segStart && h.start < excludeIdx) excluded.add(h.id); });
    // "hariç X" yapısı (sonra gelen)
    if (!excluded.size) studentHits.forEach(h => { if (h.start > excludeIdx && h.start <= excludeIdx + 4) excluded.add(h.id); });
  }

  // 6) Sonuç kümesi
  const result = new Map();
  const add = (id) => { const s = byId.get(id); if (s) result.set(id, s); };
  const groupIds = [...new Set(groupHits.flatMap(h => h.ids))];
  const explicitIds = studentHits.map(h => h.id).filter(id => !excluded.has(id));

  const scoped = groupHits.some(h => h.ablative) && !excluded.size && explicitIds.length > 0 &&
    explicitIds.every(id => groupMemberSet.has(id));

  if (scoped) {
    explicitIds.forEach(add);
  } else {
    groupIds.forEach(gid => (groupsIn.find(g => g.id === gid)?.student_ids || []).forEach(add));
    sectionHits.forEach(sh => students.filter(s => s.class === sh.section).forEach(s => add(s.id)));
    explicitIds.forEach(add);
    if (!groupIds.length && !sectionHits.length && ALL_RE.test(trClean(text))) {
      students.forEach(s => add(s.id));
      toks.forEach((tk, i) => { if (/^(herkes\w*|tum|butun|talebeler\w*|ogrenciler\w*|kurum\w*|yurt\w*)$/.test(tk.t)) used[i] = true; });
    }
  }
  excluded.forEach(id => result.delete(id));

  // 7) Rapor metni (isimler / grup adları / bağlaçlar ayıklanır)
  const keepWords = toks.filter((tk, i) => !used[i] && !FILLER.has(tk.t)).map(tk => tk.raw);
  let cleaned = keepWords.join(' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,;:\-–—.\/\\&]+/, '')
    .replace(/^((ve|ile|de|da|hepsi|tamamı|komple|bugün)\s+)*(ve|ile)\s+/i, '')
    .replace(/\b(ve|ile)\s+(ve|ile)\b/gi, '$1')
    .replace(/[,\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  cleaned = cleaned.replace(/^(ve|ile|da|de)\s+/i, '');
  if (cleaned) {
    cleaned = cleaned.charAt(0).toLocaleUpperCase('tr-TR') + cleaned.slice(1);
    if (!/[.!?]$/.test(cleaned)) cleaned += '.';
  }

  const { category, isPositive } = classify(text);
  const list = [...result.values()].map(s => ({ id: s.id, name: s.fullName, class: s.class }));
  const groupNames = groupIds.map(id => {
    const g = groupsIn.find(x => x.id === id);
    return g ? (g.section ? `${g.name} (${g.section})` : g.name) : id;
  });

  if (ambiguous.length) {
    ambiguous.forEach(a => notes.push(`"${a.word}" birden fazla talebeye uyuyor: ${a.candidates.slice(0, 5).join(', ')}. Soyadını da söyleyin.`));
  }

  return {
    matchedStudents: list,
    matchedStudentId: list[0]?.id || null,
    matchedStudentName: list[0]?.name || null,
    matchedGroupIds: groupIds,
    matchedGroupName: groupNames.length ? groupNames.join(', ') : null,
    matchedClassName: sectionHits.length ? [...new Set(sectionHits.map(s => s.section))].join(', ') : null,
    excludedStudents: [...excluded].map(id => byId.get(id)?.fullName).filter(Boolean),
    ambiguous,
    notes,
    extractedText: cleaned || 'Faaliyet kaydı tamamlandı.',
    category,
    isPositive,
    confidence: list.length ? (ambiguous.length ? 0.6 : 0.9) : 0.3,
    engine: 'local',
  };
}

// ─── Kategori ve olumlu/olumsuz ──────────────────────────────────────────────
export function classify(text) {
  const c = trClean(text);
  let category = 'Girdi Çıktı';
  if (/\b(revir\w*|hasta\w*|ilac\w*|saglik\w*|ates\w*|doktor\w*|agri\w*|kusma\w*|mide\w*|halsiz\w*|grip\w*|serum\w*|yaralan\w*|pansuman\w*|tansiyon\w*|raporlu\w*|sevk\w*|hastane\w*|acil\w*)\b|\bbas agri\w*|\bbas donme\w*/.test(c)) category = 'Sağlık';
  else if (/\b(dahil|dahili\w*|ozel ders\w*|etut\w*|birebir|sarf|nahiv|fikih|tefsir|hadis|kuran dersi\w*|ders hocasi)\b/.test(c)) category = 'Dahili Ders';
  else if (/\b(odev\w*|sinav\w*|test\w*|soru\w*|deneme\w*|net\w*|karne\w*|matematik\w*|fizik\w*|kimya\w*|biyoloji\w*|turkce\w*|tarih\w*|cografya\w*|kitap\w*|okudu\w*|calis\w*|teslim\w*|akademik\w*|paragraf\w*|ezber\w*|proje\w*|kaynatti\w*|dinlemedi\w*|derse?\w*)\b/.test(c)) category = 'Akademik';
  else if (/\b(seminer\w*|sohbet\w*|konferans\w*|gezi\w*|piknik\w*|mac\w*|turnuva\w*|halisaha\w*|sinema\w*|tiyatro\w*|etkinlik\w*|faaliyet\w*|toplanti\w*|program\w*|munazara\w*)\b/.test(c)) category = 'Program';
  else if (/\b(yoklama\w*|yemek\w*|kahvalti\w*|corba\w*|aksam yemegi|oda kontrol\w*|yatakhane\w*|tam kadro|eksiksiz)\b/.test(c)) category = 'Yoklama';
  else if (/\b(namaz\w*|yatsi\w*|sabah\w*|ogle\w*|ikindi\w*|aksam\w*|cemaat\w*|mescit\w*|cami\w*|izin\w*|carsi\w*|evci\w*|giris\w*|cikis\w*|geldi\w*|gitti\w*|ayrildi\w*|vakit\w*)\b/.test(c)) category = 'Girdi Çıktı';

  const neg = c.replace(/\b(eksiksiz|tam kadro|basarili|gayretli)\b/g, '');
  const isPositive = !/\b(katilmadi\w*|yapmadi\w*|yapmamis\w*|gelmedi\w*|gelmemis\w*|etmedi\w*|eksik\w*|olmadi\w*|vermedi\w*|gitmedi\w*|uyudu\w*|uyuyor\w*|kalkmadi\w*|kalkamadi\w*|inmedi\w*|inmemis\w*|gec kal\w*|gecikti\w*|kacti\w*|kacmis\w*|olumsuz\w*|disiplinsiz\w*|kaynatti\w*|dinlemedi\w*|bahane\w*|tartisti\w*|kavga\w*|sikayet\w*|rahatsiz\w*|yoktu|yok|bulunmadi\w*|ihmal\w*|hasta\w*|revir\w*|ates\w*|uyari\w*|ceza\w*|azarla\w*|sorun\w*|problem\w*|yaramazlik\w*|kotu\w*)\b/.test(neg);
  return { category, isPositive };
}
