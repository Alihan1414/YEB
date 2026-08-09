/**
 * clean_for_delivery.js
 *
 * Kurumların teslim öncesi temizliği:
 *   ✅ Firestore'daki tüm students koleksiyonunu sil
 *   ✅ Firestore'daki tüm reports koleksiyonunu sil
 *   ✅ Firestore'daki tüm leaveRequests koleksiyonunu sil
 *   ✅ Yerel reports_db.json'daki students/reports/leaveRequests alanlarını sıfırla
 *   🔒 Kurumlar ve kullanıcılar (şifreler dahil) korunur
 *
 * Çalıştır: node scripts/clean_for_delivery.js
 */

const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ── Firestore yardımcıları ──────────────────────────────────────────────────

async function listCollection(collectionName) {
  const url = `${BASE_FS}/${collectionName}?key=${FIREBASE_API_KEY}&pageSize=300`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!data.documents) return [];
  return data.documents.map(doc => doc.name); // tam path: projects/.../documents/col/id
}

async function deleteDoc(fullPath) {
  const url = `https://firestore.googleapis.com/v1/${fullPath}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(`DELETE ${fullPath} → ${res.status}: ${txt}`);
  }
}

async function clearCollection(collectionName) {
  console.log(`\n🗑️  "${collectionName}" koleksiyonu temizleniyor...`);
  let docs;
  try {
    docs = await listCollection(collectionName);
  } catch (e) {
    console.warn(`   ⚠️  Liste alınamadı (${e.message}) — atlanıyor.`);
    return 0;
  }

  if (docs.length === 0) {
    console.log(`   ℹ️  Zaten boş.`);
    return 0;
  }

  let deleted = 0;
  for (const fullPath of docs) {
    try {
      await deleteDoc(fullPath);
      deleted++;
      const id = fullPath.split('/').pop();
      process.stdout.write(`   ✅ Silindi: ${id}\n`);
    } catch (e) {
      console.error(`   ❌ Silinemedi: ${fullPath} — ${e.message}`);
    }
  }
  return deleted;
}

// ── Yerel JSON temizliği ────────────────────────────────────────────────────

function cleanLocalDb() {
  const dbPath = path.join(__dirname, '../src/data/reports_db.json');
  if (!fs.existsSync(dbPath)) {
    console.log('\nℹ️  Yerel DB dosyası bulunamadı, atlanıyor.');
    return;
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const beforeStudents = (db.students       || []).length;
  const beforeReports  = (db.reports        || []).length;
  const beforeLeaves   = (db.leaveRequests  || []).length;

  db.students      = [];
  db.reports       = [];
  db.leaveRequests = [];

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`\n📂 Yerel DB temizlendi (${dbPath}):`);
  console.log(`   Öğrenci: ${beforeStudents} → 0`);
  console.log(`   Rapor:   ${beforeReports} → 0`);
  console.log(`   İzin:    ${beforeLeaves} → 0`);
}

// ── Ana akış ────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   📦  TESLİMAT HAZIRLIĞI — VERİ TEMİZLEME BAŞLIYOR   ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔒  Kurumlar ve kullanıcılar korunuyor...\n');

  // 1. Firestore koleksiyonları
  const s = await clearCollection('students');
  const r = await clearCollection('reports');
  const l = await clearCollection('leaveRequests');

  // 2. Yerel JSON
  cleanLocalDb();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅  TEMİZLEME TAMAMLANDI');
  console.log(`   Firestore'dan silinen belgeler:`);
  console.log(`     • Öğrenci:     ${s}`);
  console.log(`     • Rapor:       ${r}`);
  console.log(`     • İzin Talebi: ${l}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n🎁  Sistem kurum yöneticilerine teslim edilmeye hazır!');
}

run().catch(err => {
  console.error('\n🔥 Beklenmedik hata:', err);
  process.exit(1);
});
