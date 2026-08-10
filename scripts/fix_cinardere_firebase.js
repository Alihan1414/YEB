/**
 * fix_cinardere_firebase.js
 * Firebase'deki bozuk Çınardere Erenler öğrencilerini siler,
 * yerine local DB'deki temiz 35 öğrenciyi yazar.
 *
 * Kullanım: node scripts/fix_cinardere_firebase.js
 */

const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db     = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const INST_ID = 'cinardere-erenler';

// ── Firestore helpers ─────────────────────────────────────────────────────────
async function listStudents() {
  const docs = [];
  let pageToken = '';
  do {
    const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `${BASE_FS}/students?key=${FIREBASE_API_KEY}&pageSize=300${tokenParam}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    (data.documents || []).forEach(d => docs.push(d));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function deleteDoc(docName) {
  const url = `https://firestore.googleapis.com/v1/${docName}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, { method: 'DELETE' });
  return res.ok;
}

async function createStudent(student) {
  // Use PATCH with documentId to set a predictable ID
  const url = `${BASE_FS}/students/${student.id}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name:           { stringValue: student.name },
        surname:        { stringValue: student.surname },
        class:          { stringValue: student.class },
        parent_email:   { stringValue: student.parent_email || '' },
        parent_phone:   { stringValue: student.parent_phone || '' },
        institution_id: { stringValue: student.institution_id },
        created_at:     { stringValue: student.created_at },
      }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📡 Firebase\'den mevcut öğrenciler çekiliyor...\n');

  // 1. Tüm students'ı çek
  const allDocs = await listStudents();
  const erenlerDocs = allDocs.filter(doc => {
    const inst = doc.fields?.institution_id?.stringValue || '';
    return inst === INST_ID;
  });

  console.log(`🗑️  Silinecek bozuk kayıt sayısı: ${erenlerDocs.length}`);

  // 2. Hepsini sil
  let deleted = 0;
  for (const doc of erenlerDocs) {
    const shortName = doc.name.split('/').pop();
    try {
      await deleteDoc(doc.name);
      console.log(`  ❌ Silindi: ${shortName}`);
      deleted++;
    } catch (e) {
      console.warn(`  ⚠️ Silinemedi: ${shortName} — ${e.message}`);
    }
    await sleep(50); // rate limit
  }

  console.log(`\n✅ ${deleted} kayıt silindi.\n`);
  console.log('📤 Temiz öğrenciler Firebase\'e yazılıyor...\n');

  // 3. Local DB'den temiz öğrencileri al
  const temizOgrenciler = db.students.filter(s => s.institution_id === INST_ID);
  console.log(`📚 Eklenecek öğrenci sayısı: ${temizOgrenciler.length}\n`);

  let added = 0;
  for (const s of temizOgrenciler) {
    try {
      await createStudent(s);
      console.log(`  ✅ Eklendi: ${s.name} ${s.surname} (${s.class})`);
      added++;
    } catch (e) {
      console.warn(`  ⚠️ Eklenemedi: ${s.name} ${s.surname} — ${e.message}`);
    }
    await sleep(80); // rate limit
  }

  console.log(`\n🎉 Tamamlandı! ${added} temiz öğrenci Firebase\'e yazıldı.`);
}

main().catch(console.error);
