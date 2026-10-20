/**
 * Bolu Kılıçarslan — grup ve talebe listesini (Ekim 2026 listesi) Firestore'a senkronlar.
 *  - Grupların ID'leri ve öğretmen atamaları korunur, sadece ad / sıra / öğrenciler güncellenir.
 *  - Mevcut öğrenciler ada göre eşleştirilir → ID korunur → eski raporlar kaybolmaz.
 *  - Listede olmayan öğrenciler silinir, yeni öğrenciler eklenir.
 * Çalıştırma:  node scripts/sync_kilicaslan_groups_2026.js
 */
const fs = require('fs');
const path = require('path');

const P = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-reports-app-22e38';
const K = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDAkvmh3UMgWeKs-Cqjd4_hS6pzb2pXkqU';
const INST = 'bolu-kilicaslan';
const BASE = `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents`;

// Sıra kullanıcının istediği gibi: Çetinkaya, Aldemir, Mısırlı, Güney, Çetinkaya, Yerlikaya, Kalkan, Zauzı, Kaşıtoğlu
const GROUPS = [
  { id: 'group-hazirlik-cetinkaya', name: 'Çetinkaya', section: 'Hazırlık',
    aliases: ['M. Çetinkaya', 'Mustafa Çetinkaya', 'Mustafa hoca', 'Hazırlık Çetinkaya'],
    students: ['Kemal Nurbayev', 'Muhammad Fakhri Akbar', 'Muhammad Abdu Romy Al Aziza', 'Kenryu Hyde Sirodjudin',
      'Halil İbrahim Sucu', 'Ahmad Naufal', 'İsmail Abbas', 'Ömer Abbas'] },
  { id: 'group-hazirlik-aldemir', name: 'Aldemir', section: 'Hazırlık',
    aliases: ['M.S. Aldemir', 'Serkan Aldemir', 'Serkan hoca'],
    students: ['Ahmet Yiğit Öksün', 'Osman Enes Özenoğlu', 'Ahmet Emre Levent', 'Taha Emin Gümüş', 'Emirhan Toygar',
      'Ahmet Sefa Güneş', 'Furkan Hamza Özdemir', 'Mustafa Emre Uran', 'Yunus Emre Yiğit', 'Alim Taha Akpınar',
      'Mustafa Hilmi Küçük', 'Nazım Büyüktorun'] },
  { id: 'group-ibtidai-misirli', name: 'Mısırlı', section: 'İbtidai',
    aliases: ['E. Mısırlı', 'Emirhan Mısırlı', 'Emirhan hoca'],
    students: ['Hüseyin Hilmi Ataseven', 'Hanefi Enes Kılıç', 'Nurali Bakhatkhan', 'İsmail Üstün', 'Muhammet Ali Baskın',
      'Yavuz Selim Yener', 'Abshir Ahmed Osman', 'Haroune Ouedraga', 'Ibrahim Djibo', 'Hazrat Adıgözeloğlu',
      'Youssouf Diakite', 'Haşim Öngür', 'Abdullah Kurnaz'] },
  { id: 'group-ibtidai-guney', name: 'Güney', section: 'İbtidai',
    aliases: ['T. Güney', 'Tuncay Güney', 'Tuncay hoca'],
    students: ['Kerem Kabak', 'Hasan Furkan Orhan', 'Ömer Faruk Demirci', 'İbrahime Sarba', 'Hakam Abdullah Fatih',
      'İbrahim Kenar', 'Mehmet Emin Çelik', 'Muhamad Ihsan Abdul Azis Malik', 'Muhammad Atif Al Farisi',
      'Ahmet Fidan', 'Mehmet Onur Keleş'] },
  { id: 'group-ihzari-cetinkaya', name: 'Çetinkaya', section: 'İhzari',
    aliases: ['İ. Çetinkaya', 'İbrahim Çetinkaya', 'İbrahim hoca', 'İhzari Çetinkaya'],
    students: ['Ahmet Faruk Ağır', 'Ahmet Arif Olğun', 'Yunus Emre Erdoğan', 'Hüseyin Hilmi Öztemur', 'Tunahan Kurt',
      'Mücahit Mert Demirözü', 'Mehmet Hayati Fidan', 'Mahad Abdirashid Farah', 'Taner Çelik', 'Mehmet Talha Barazama',
      'Emirhan Sarı', 'Hamza Akbel', 'Abdirashid Ibrahim Hassan', 'Rıdvan Emir Koşar', 'Khadar Ismail Abokor',
      'Ferhat Uyar', 'Emre Şimşek', 'Mustafa Doğan'] },
  { id: 'group-k-kerim-yerlikaya', name: 'Yerlikaya', section: 'K. Kerim',
    aliases: ['N. Yerlikaya'],
    students: ['Hassan Wamanga', 'Fakhru Rais Dzarari Malay', 'Prima Wijaya Mahendra Putra', 'Muhammad Rauza Hudzam Almahi'] },
  { id: 'group-k-kerim-kalkan', name: 'Kalkan', section: 'K. Kerim',
    aliases: ['M. Kalkan'],
    students: ['Hüseyin Kerim Arı'] },
  { id: 'group-muh-k-kerim-zauzi', name: 'Zauzı', section: 'Muh. K. Kerim',
    aliases: ['K. Zauzi', 'Zauzi', 'Zavzı'],
    students: ['Zeki Endonezyalı', 'Nofiyen Endonezyalı', 'Halid', 'Abdulaziz Pakistanî'] },
  { id: 'group-tekamul-alti-kasitoglu', name: 'Kaşıtoğlu', section: 'Tekamül Altı',
    aliases: ['L.M. Kaşıtoğlu', 'Latif Kaşıtoğlu', 'Latif hoca', 'Kaşiyoğlu', 'Kaşitoğlu'],
    students: ['Nazif Can Coşgun', 'Emir Salih Gümrük', 'Hilmi Sevban Sarıyar', 'İsmail Can Tunalı', 'Ahmet Kemal Kocakuzgun',
      'Hensarmu Aman Gemechu', 'Mansour Etminan', 'Mehmet Arif Çalışkan', 'Mehmet Emin İnce', 'Mehmet Ali Kavuştur'] },
];

const norm = (s) => (s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[âîû]/g, m => ({ â: 'a', î: 'i', û: 'u' })[m]).replace(/[^a-z0-9]/g, '');

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { name: parts[0], surname: '' };
  return { name: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] };
}

const S = (v) => ({ stringValue: String(v ?? '') });
const ARR = (l) => ({ arrayValue: { values: l.map(x => ({ stringValue: String(x) })) } });

async function req(url, opts = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.ok || r.status === 404) return r;
      if (r.status < 500 && r.status !== 429) throw new Error(`HTTP ${r.status} ${await r.text()}`);
    } catch (e) { if (i === tries - 1) throw e; }
    await new Promise(res => setTimeout(res, 400 * (i + 1)));
  }
  throw new Error('istek başarısız: ' + url);
}

async function listAll(col) {
  const out = []; let t = '';
  do {
    const r = await req(`${BASE}/${col}?key=${K}&pageSize=300${t ? '&pageToken=' + encodeURIComponent(t) : ''}`);
    const d = await r.json(); out.push(...(d.documents || [])); t = d.nextPageToken || '';
  } while (t);
  return out;
}

const patch = (p, fields, mask) => req(`${BASE}/${p}?key=${K}${mask ? mask.map(m => '&updateMask.fieldPaths=' + m).join('') : ''}`,
  { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
const del = (p) => req(`${BASE}/${p}?key=${K}`, { method: 'DELETE' });

(async () => {
  console.log('=== Kılıçarslan grup/talebe senkronu ===');
  const existing = (await listAll('students')).filter(d => (d.fields?.institution_id?.stringValue || '') === INST);
  const byName = new Map();
  existing.forEach(d => {
    const f = d.fields;
    const key = norm(`${f.name?.stringValue || ''}${f.surname?.stringValue || ''}`);
    if (!byName.has(key)) byName.set(key, d.name.split('/').pop());
  });
  // Eski kayıttaki hatalı ad → yeni ad eşleştirmesi (ID ve raporlar korunsun)
  const RENAMES = { [norm('Mustafa Hilmi')]: norm('Mustafa Hilmi Küçük') };
  for (const [oldK, newK] of Object.entries(RENAMES)) if (byName.has(oldK) && !byName.has(newK)) byName.set(newK, byName.get(oldK));

  const keepIds = new Set();
  const localStudents = [];
  const now = new Date().toISOString();
  let created = 0, updated = 0, seq = 0;

  for (let gi = 0; gi < GROUPS.length; gi++) {
    const g = GROUPS[gi];
    const ids = [];
    for (const full of g.students) {
      const { name, surname } = splitName(full);
      const key = norm(full);
      let id = byName.get(key);
      if (id && keepIds.has(id)) id = null; // aynı isimli iki talebe varsa ikinciyi yeni oluştur
      const isNew = !id;
      if (isNew) id = `student-kilicaslan-2026-${Date.now()}-${++seq}`;
      keepIds.add(id);
      ids.push(id);
      const fields = { name: S(name), surname: S(surname), class: S(g.section), institution_id: S(INST) };
      if (isNew) { fields.created_at = { timestampValue: now }; fields.parent_phone = S(''); }
      await patch(`students/${id}`, fields, isNew ? null : ['name', 'surname', 'class', 'institution_id']);
      isNew ? created++ : updated++;
      localStudents.push({ id, name, surname, class: g.section, parent_phone: '', institution_id: INST, created_at: now, checkout_time: null });
    }
    await patch(`teacher_groups/${g.id}`, {
      name: S(g.name), section: S(g.section), aliases: ARR(g.aliases), order: { integerValue: String(gi + 1) },
      student_ids: ARR(ids), student_names: ARR(g.students), institution_id: S(INST),
    }, ['name', 'section', 'aliases', 'order', 'student_ids', 'student_names', 'institution_id']);
    g._ids = ids;
    console.log(`✓ ${gi + 1}. ${g.name} (${g.section}) — ${ids.length} talebe`);
  }

  const removed = existing.filter(d => !keepIds.has(d.name.split('/').pop()));
  for (const d of removed) {
    await del(`students/${d.name.split('/').pop()}`);
    console.log(`  - silindi: ${d.fields.name?.stringValue} ${d.fields.surname?.stringValue}`);
  }

  // Yerel yedeği de eşitle
  const DB = path.join(__dirname, '..', 'src', 'data', 'reports_db.json');
  try {
    const db = JSON.parse(fs.readFileSync(DB, 'utf-8'));
    db.students = [...(db.students || []).filter(s => (s.institution_id || s.institutionId) !== INST), ...localStudents];
    db.teacher_groups = [
      ...(db.teacher_groups || []).filter(g => (g.institution_id || g.institutionId) !== INST),
      ...GROUPS.map((g, i) => ({ id: g.id, name: g.name, section: g.section, aliases: g.aliases, order: i + 1,
        student_ids: g._ids, student_names: g.students, institution_id: INST })),
    ];
    fs.writeFileSync(DB, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) { console.warn('Yerel yedek güncellenemedi:', e.message); }

  console.log(`\nToplam: ${keepIds.size} talebe | yeni ${created} | güncellenen ${updated} | silinen ${removed.length}`);
})().catch(e => { console.error('HATA:', e); process.exit(1); });
