/**
 * disable_yamanevler_pendik.js
 * Yamanevler Enderun Bilişim (YEB) ve Pendik Talebe Yurdu (Pendik Merkez)
 * kurumlarını DEVRE DIŞI bırakır. Hiçbir veri silinmez.
 *
 * Kullanım:
 *   node scripts/disable_yamanevler_pendik.js            -> devre dışı bırak
 *   node scripts/disable_yamanevler_pendik.js --enable   -> geri aç
 */

const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const TARGET_IDS = ['yamanevler', 'pendik-talebe-yurdu'];
const DISABLED   = !process.argv.includes('--enable');

const dbPath = path.join(__dirname, '../src/data/reports_db.json');

async function patchDisabled(docPath) {
  const url = `${BASE_FS}/${docPath}?updateMask.fieldPaths=disabled&key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { disabled: { booleanValue: DISABLED } } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

async function fetchAllUsers() {
  const docs = [];
  let pageToken = '';
  do {
    const tp = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const res = await fetch(`${BASE_FS}/users?key=${FIREBASE_API_KEY}&pageSize=300${tp}`);
    if (!res.ok) throw new Error(`Kullanıcılar alınamadı: ${res.status}`);
    const data = await res.json();
    (data.documents || []).forEach(d => docs.push(d));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function run() {
  const verb = DISABLED ? 'devre dışı bırakılıyor' : 'aktifleştiriliyor';
  console.log(`🔄 Kurumlar ${verb}: ${TARGET_IDS.join(', ')}\n`);

  // 1. Yerel DB
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  (db.institutions || []).forEach(i => { if (TARGET_IDS.includes(i.id)) i.disabled = DISABLED; });
  (db.users || []).forEach(u => { if (TARGET_IDS.includes(u.institutionId)) u.disabled = DISABLED; });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log('✅ Yerel DB güncellendi.');

  // 2. Firestore: institutions koleksiyonu
  for (const id of TARGET_IDS) {
    try {
      await patchDisabled(`institutions/${id}`);
      console.log(`✅ institutions/${id}`);
    } catch (e) { console.warn(`⚠️ institutions/${id}:`, e.message); }
  }

  // 3. Firestore: kuruma bağlı tüm kullanıcılar (yönetici + öğretmen + aşçı vb.)
  const users = await fetchAllUsers();
  const targets = users.filter(d => TARGET_IDS.includes(d.fields?.institutionId?.stringValue));
  for (const d of targets) {
    const uid = d.name.split('/').pop();
    try {
      await patchDisabled(`users/${uid}`);
      console.log(`✅ users/${uid} (${d.fields?.email?.stringValue || ''})`);
    } catch (e) { console.warn(`⚠️ users/${uid}:`, e.message); }
  }

  console.log(`\n🎉 Tamamlandı. ${targets.length} kullanıcı ${DISABLED ? 'devre dışı' : 'aktif'}.`);
}

run().catch(e => { console.error(e); process.exit(1); });
